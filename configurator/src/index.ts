// Configurator Worker - serves the UI
export default {
  async fetch(request: Request): Promise<Response> {
    const html = await fetch('https://raw.githubusercontent.com/arananet/edgeneuro/main/configurator/index.html').then(r => r.text());
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};
