using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SpaServices.AngularCli;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;

namespace DigitalKhatt
{
  public class Startup
  {
    public Startup(IConfiguration configuration)
    {
      Configuration = configuration;
    }

    public IConfiguration Configuration { get; }

    // This method gets called by the runtime. Use this method to add services to the container.
    public void ConfigureServices(IServiceCollection services)
    {

      // In production, the Angular files will be served from this directory
      services.AddSpaStaticFiles(configuration =>
      {
        configuration.RootPath = "ClientApp/dist/browser";
      });
    }

    // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
      if (env.EnvironmentName == "Development")
      {
        app.UseDeveloperExceptionPage();
      }
      else
      {
        app.UseExceptionHandler("/Error");
        // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
        app.UseHsts();
      }

      var provider = new FileExtensionContentTypeProvider();
      // Add new mappings           
      provider.Mappings[".mp"] = "text/plain";
      provider.Mappings[".properties"] = "text/plain";
      provider.Mappings[".fea"] = "text/plain";
      provider.Mappings[".webmanifest"] = "application/manifest+json";
      provider.Mappings[".dat"] = "application/octet-stream";
      provider.Mappings[".mem"] = "text/html";



      app.UseStaticFiles(new StaticFileOptions
      {
        ContentTypeProvider = provider
      });

      app.UseSpaStaticFiles(new StaticFileOptions
      {
        ContentTypeProvider = provider
      });

      app.UseRouting();

      /*
      app.Use(async (context, next) =>
      {
        var logger = context.RequestServices.GetService<ILogger<Program>>();

        //logger.LogInformation($"context.Request.Path={context.Request.Path}");
        if (context.Request.Path.Value.Contains("ngsw.json"))
        {
          logger.LogWarning("ngsw.json returns 404");
          context.Response.StatusCode = 404;
        }
        else
        {
          await next.Invoke();
        }

      });*/


      app.UseSpa(spa =>
      {
        // To learn more about options for serving an Angular SPA from ASP.NET Core,
        // see https://go.microsoft.com/fwlink/?linkid=864501

        spa.Options.SourcePath = "ClientApp";

        if (env.EnvironmentName == "Development")
        {
          //spa.UseAngularCliServer(npmScript: "start");
          spa.UseProxyToSpaDevelopmentServer("http://localhost:4200");
        }
      });




    }
  }
}
