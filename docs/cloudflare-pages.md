# Webversie op Cloudflare Pages

De site is statisch, zonder build-stap. Cloudflare Pages haalt de repo op en zet de hoofdmap online.

## Instellingen in Cloudflare

Workers & Pages › Create › Pages › Connect to Git › `keeshehenkamp/kopwerk`.

| Veld | Waarde |
|---|---|
| Projectnaam | `kopwerk` (geeft `kopwerk.pages.dev`) |
| Production branch | `main` |
| Framework preset | None |
| Build command | leeg |
| Build output directory | `/` |

Elke push naar `main` zet de site online; elke pull request krijgt een eigen voorbeeldlink.

## Bestanden in de repo

- `_headers`: veiligheidskoppen en geen cache voor `index.html`.
- `worker/strava-worker.js`: `kopwerk.pages.dev` staat bij de toegestane herkomsten. Komt er een eigen domein, voeg dat dan ook toe en zet de Worker opnieuw online.

## Na de eerste keer online (Firebase)

Firebase-console › Authentication › Settings › Authorized domains: voeg `kopwerk.pages.dev` toe (en later het eigen domein). Zonder dit werkt inloggen met Google of Apple niet op de nieuwe plek.

## Volgorde van de verhuizing

1. Cloudflare-account en Pages-project maken, eerste deploy afwachten.
2. Firebase-domein toevoegen, inloggen en een rit testen op `kopwerk.pages.dev`.
3. Eigen domein koppelen (Pages › Custom domains), domein ook toevoegen in Firebase en in de Worker.
4. GitHub Pages uitzetten (repo › Settings › Pages).
5. Pas daarna de repo privé zetten. Gratis GitHub Pages werkt niet met een privé repo, dus stap 1–3 moeten eerst af zijn.
