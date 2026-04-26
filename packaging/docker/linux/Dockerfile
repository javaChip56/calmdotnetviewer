FROM mcr.microsoft.com/dotnet/aspnet:9.0

WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY . .

ENTRYPOINT ["dotnet", "CALMdotNetViewer.Web.dll"]
