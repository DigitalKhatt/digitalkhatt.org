"""Add the text-mode position features (jp01..jpNN) to a DigitalKhatt font.

Input is the StretchTable written by `npm run collect` (glyph -> stretched
variants seen when the app's justifier runs over the whole text). Output is a
copy of the font with:
  * one AlternateSubst lookup: glyph -> its stretched variants;
  * features jp01..jpNN: jpKK swaps the glyph at position KK of the shaping
    buffer (the word span) for variant number <feature value>.
The new lookups come after every existing GSUB lookup, so they act on final
glyphs, and GPOS (kerning, cursive attachment, marks) then positions exactly
the glyph sequence the app gets with its per-letter cvNN features.

    python patch_font.py ../../ClientApp/src/assets/fonts/hb/madina.otf \
        out/newmadina-stretch.json out/madina-textmode.otf

Requires fontTools. The fonts are OFL; a modified font must not use the
original name only, so the family gets a " TextMode" suffix by default.
"""
import argparse
import json

from fontTools.otlLib import builder as otl
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables as ot

MAX_POSITIONS = 99


def tag_for(position):
    """0-based glyph position -> feature tag (must match textmode.ts tagFor)."""
    return f"jp{position + 1:02d}"


def _all_glyph_coverage(glyph_order):
    return otl.buildCoverage(glyph_order, {g: i for i, g in enumerate(glyph_order)})


def patch_font(src_path, out_path, alternates, positions, family=None):
    """Write a copy of the font with ALT + jp01..jpNN (NN = `positions`).
    `alternates`: {glyph_id: [variant glyph ids]} (CSS value v = list index + 1)."""
    font = TTFont(src_path)
    order = font.getGlyphOrder()
    gsub = font["GSUB"].table
    lookups = gsub.LookupList.Lookup

    alt_map = {order[int(g)]: [order[x] for x in xs] for g, xs in alternates.items() if xs}
    alt_lookup = otl.buildLookup([otl.buildAlternateSubstSubtable(alt_map)])
    lookups.append(alt_lookup)
    alt_index = len(lookups) - 1

    def chain_subtable(backtrack, with_lookup):
        st = ot.ChainContextSubst()
        st.Format = 3
        st.BacktrackGlyphCount = backtrack
        st.BacktrackCoverage = [_all_glyph_coverage(order) for _ in range(backtrack)]
        st.InputGlyphCount = 1
        st.InputCoverage = [_all_glyph_coverage(order)]
        st.LookAheadGlyphCount = 0
        st.LookAheadCoverage = []
        records = []
        if with_lookup:
            rec = ot.SubstLookupRecord()
            rec.SequenceIndex, rec.LookupListIndex = 0, alt_index
            records.append(rec)
        st.SubstLookupRecord = records
        st.SubstCount = len(records)
        return st

    new_features = []
    for pos in range(positions):
        # first subtable: "more than pos glyphs before me" -> match, do nothing
        # second: exactly pos glyphs before me (buffer start) -> substitute
        lookup = otl.buildLookup([chain_subtable(pos + 1, False), chain_subtable(pos, True)])
        lookups.append(lookup)
        new_features.append((tag_for(pos), len(lookups) - 1))
    gsub.LookupList.LookupCount = len(lookups)

    feat_list = gsub.FeatureList
    added = []
    for tag, lookup_index in new_features:
        rec = ot.FeatureRecord()
        rec.FeatureTag = tag
        rec.Feature = ot.Feature()
        rec.Feature.FeatureParams = None
        rec.Feature.LookupListIndex = [lookup_index]
        rec.Feature.LookupCount = 1
        feat_list.FeatureRecord.append(rec)
        added.append(len(feat_list.FeatureRecord) - 1)
    feat_list.FeatureCount = len(feat_list.FeatureRecord)

    for script in gsub.ScriptList.ScriptRecord:
        langsyses = [script.Script.DefaultLangSys] + [r.LangSys for r in script.Script.LangSysRecord]
        for ls in langsyses:
            if ls is None:
                continue
            ls.FeatureIndex = list(ls.FeatureIndex) + added
            ls.FeatureCount = len(ls.FeatureIndex)

    # FeatureList must stay sorted by tag for some consumers; sort and remap.
    _sort_feature_list(gsub)

    if family:
        _rename(font, family)
    font.save(out_path)


def _sort_feature_list(gsub):
    recs = gsub.FeatureList.FeatureRecord
    order = sorted(range(len(recs)), key=lambda i: recs[i].FeatureTag)
    remap = {old: new for new, old in enumerate(order)}
    gsub.FeatureList.FeatureRecord = [recs[i] for i in order]
    for script in gsub.ScriptList.ScriptRecord:
        langsyses = [script.Script.DefaultLangSys] + [r.LangSys for r in script.Script.LangSysRecord]
        for ls in langsyses:
            if ls is None:
                continue
            ls.FeatureIndex = sorted(remap[i] for i in ls.FeatureIndex)
            if ls.ReqFeatureIndex != 0xFFFF:
                ls.ReqFeatureIndex = remap[ls.ReqFeatureIndex]


def _rename(font, family):
    name = font["name"]
    old_full = name.getDebugName(4) or ""
    for rec in list(name.names):
        if rec.nameID in (1, 16):
            rec.string = family
        elif rec.nameID == 4:
            rec.string = f"{family} Regular"
        elif rec.nameID == 6:
            rec.string = family.replace(" ", "") + "-Regular"
        elif rec.nameID == 3:
            rec.string = f"{family}; modified from {old_full}"
    if "CFF " in font:
        cff = font["CFF "].cff
        cff.fontNames = [family.replace(" ", "") + "-Regular"]


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Add jpNN text-mode features to a font")
    ap.add_argument("font")
    ap.add_argument("stretch_json", help="output of `npm run collect`")
    ap.add_argument("out")
    ap.add_argument("--family", help="new family name (default: original + ' TextMode')")
    a = ap.parse_args()
    with open(a.stretch_json, encoding="utf-8") as fh:
        table = json.load(fh)
    family = a.family or TTFont(a.font)["name"].getDebugName(1) + " TextMode"
    patch_font(a.font, a.out, table["alternates"], table["positions"], family)
    print(f"{a.out}: jp01..jp{table['positions']:02d}, "
          f"{sum(len(v) for v in table['alternates'].values())} variants, family '{family}'")
