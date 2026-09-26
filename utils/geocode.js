// Transforma um endereço digitado (ex: "Santo André, SP") em coordenadas
// (latitude/longitude), usando o serviço gratuito Nominatim (OpenStreetMap).
// Não precisa de chave de API, mas é educado (e exigido pelas regras de uso
// do serviço) mandar um User-Agent identificando o app.
async function geocodeLocation(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(address)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FavorApp/1.0 (projeto academico)'
      }
    });

    if (!response.ok) {
      console.error('Nominatim respondeu com erro:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return null; // endereço não encontrado
    }

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  } catch (err) {
    console.error('Erro ao geocodificar endereço:', err.message);
    return null;
  }
}

module.exports = { geocodeLocation };
