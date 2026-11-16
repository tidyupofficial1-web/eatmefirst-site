/* Configurazione unica. Percorsi relativi alla radice dell'app.
 * Nessuna campagna reale e nessuno spot attivo finché il video non è pronto.
 * Date sponsor: ISO 8601 con fuso esplicito, fine esclusiva.
 * Uno sponsor per lingua/periodo; controllare sovrapposizioni prima di confermare.
 */
window.EatMenuSpacesConfig = {
  enabled: true,
  dailyLimit: 5,
  minIntervalMinutes: 30,
  ownContent: [],
  campaigns: []
};
/* Esempio NON ATTIVO:
ownContent: [{ id: 'eatmefirst-buon-anno-2027', enabled: true,
  videos: { IT: 'media/spot/eatmefirst-buon-anno-it.mp4' } }]
campaigns: [{ id: 'negozio-periodo', enabled: true, languages: ['IT'],
  startsAt: '2027-01-01T00:00:00+01:00', endsAt: '2027-01-11T00:00:00+01:00',
  videos: { IT: 'media/spot/negozio-it.mp4' },
  banner: { name: 'Nome negozio', motto: 'Breve messaggio',
    website: 'https://www.negozio.example', logo: 'media/spot/negozio-logo.png' } }]
*/
