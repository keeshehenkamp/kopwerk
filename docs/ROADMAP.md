# Kopwerk naar de App Store

Stand: 17 november 2026. Dit is het werkplan om Kopwerk van een persoonlijke webapp naar een betaalde app in de App Store te brengen, en het bedrijfje eromheen op te zetten. Elke taak staat bij één van vier sporen en is gemarkeerd:

- **[Claude]**: kan Claude in een thread doen (code, teksten, ontwerp, onderzoek).
- **[Kees]**: moet Kees zelf doen (accounts, betalen, ondertekenen, inschrijven, beslissen).
- **[samen]**: Claude bereidt voor, Kees beslist of rondt af.

## Waar de app nu staat

Kopwerk is een webapp zonder build-stap (gewone html, css en js, ongeveer 780 kB code), live via GitHub Pages. Er is een sterke kern: een coach die het schema maakt (`planner.js`, met eigen controles in `tools/planner-test/`), een player die een smart trainer via Web Bluetooth (FTMS/ERG) aanstuurt, analyse na de rit, import en export, sync via Firebase met Google-login, Strava-koppeling via een Cloudflare Worker, groepsritten, en een 3D-wereld (three.js) met de Mont Ventoux en de Ronde Hoep.

Wat een App Store-lancering nu tegenhoudt:

1. **Rijden werkt niet op iPhone of iPad.** Safari en elke app-webview op iOS hebben geen Web Bluetooth. Op iOS toont Kopwerk nu geen startknoppen. Juist het rijden is de kern, dus de iOS-app heeft een native Bluetooth-laag nodig.
2. **Er is geen iOS-project.** Geen Xcode-project, geen Capacitor, geen ondertekening. Een app die alleen een website toont, wijst Apple af (richtlijn 4.2); met native Bluetooth, trainerbesturing en offline gebruik is dat geen probleem.
3. **De app is nu van één persoon.** `firestore.rules` laat alleen twee e-mailadressen van Kees toe. Een andere gebruiker kan niet synchroniseren.
4. **Inloggen en privacy voldoen nog niet aan Apple.** Wie Google-login aanbiedt, moet ook Inloggen met Apple (of gelijkwaardig) aanbieden (4.8). Een account moet in de app te verwijderen zijn (5.1.1). Hartslag is een gezondheidsgegeven: daar is uitdrukkelijke toestemming en een privacybeleid voor nodig.
5. **Niet offline.** three.js komt van een CDN, de lettertypes van Google Fonts, en er is geen service worker. In een app moet alles meegeleverd worden (ook netter voor de AVG).
6. **Geen verdienmodel in de code.** Geen abonnement, geen proefperiode, geen betaalscherm.
7. **Kleine losse eindjes.** Strava staat uit (`CONFIG.strava: null`), en dan geldt Strava's API-limiet (nieuwe apps eerst één atleet, daarna aanvragen). `docs/onderbouwing.md` staat wel in de map op de laptop maar niet in de repo. De app is alleen in het Nederlands.

## Besloten

- 17-11-2026: Kees heeft een Mac; de iOS-app wordt daar gebouwd.
- 17-11-2026: inloggen kan met Apple, Google of een eigen account.
- 17-11-2026: op de telefoon rijd je alleen in cijfers, zonder 3D-wereld.
- 17-11-2026: er komt ook een versie voor de laptop (Mac en Windows). Voorstel: de repo wordt privé, de webversie verhuist naar Cloudflare Pages (gratis) en de iPad-app staat ook in de Mac App Store voor Macs met een Apple-chip. Een abonnement moet dan ook op het web te kopen zijn (bijvoorbeeld Stripe, samen met de App Store via RevenueCat).

## Spoor 1: Product en code

**Fase A: iOS-app die rijdt** (eerst, want dit is het grootste risico)

- [Claude] ✓ Capacitor toevoegen: de bestaande webapp gaat ongewijzigd in een native iOS-schil. Webversie blijft gewoon werken. (17-11-2026, Capacitor 8, bundle-ID voorlopig `nl.kopwerk.app`)
- [Claude] ✓ Bluetooth-laag die op het web Web Bluetooth gebruikt en in de app de native plugin (`@capacitor-community/bluetooth-le`, via `js/native.js`): FTMS-trainer, ERG, hartslagmeter. Getest met een nagebootste trainer; nog te testen met de echte trainer.
- [Claude] Alles meeleveren in de app: three.js, lettertypes, modellen. Daarna ook een service worker voor de webversie.
- [Claude] Scherm aan houden en geluid tijdens een rit met native plugins; app op de achtergrond mag de rit niet breken. Scherm aan ✓ (KeepAwake), Bluetooth blijft verbonden op de achtergrond ✓; geluid nog na te lopen op de iPhone.
- [Claude] ✓ Op de telefoon rijd je alleen in cijfers (besloten 17-11-2026): het rijscherm zonder 3D-wereld. De 3D-wereld wordt op de telefoon niet geladen. Op iPad en laptop blijft hij; prestaties op iPad meten en zo nodig een lichtere stand maken (het fietsermodel is 1,7 MB, de Ventoux-hoogtekaart 0,5 MB).
- [Kees] Xcode installeren op je Mac en daar bouwen en ondertekenen (Kees heeft een Mac, dus geen bouwdienst nodig).
- [Kees] Testen met de eigen trainer en hartslagmeter via TestFlight.
- [Claude] Inloggen met Apple en Google in de iOS-app via iOS zelf (nu alleen e-mail in de app).

**Fase B: klaar voor vreemden**

- [Claude] Firestore-regels voor iedere gebruiker (alleen je eigen gegevens) in plaats van de twee vaste adressen. Groepsritten blijven zoals ze zijn.
- [Claude] Inloggen met Apple, Google of een eigen account met e-mail en wachtwoord (besloten 17-11-2026); account en alle gegevens verwijderen vanuit Profiel.
- [Claude] Toestemmingsvraag voor hartslag en gezondheidsgegevens bij de eerste keer.
- [Claude] Eerste keer openen voor een onbekende gebruiker: kort en zonder uitleg, binnen de ontwerpregels (niveau, tijd, doel, trainer koppelen).
- [Claude] Scherm met licenties en bronnen (OpenStreetMap, OpenFreeMap, Terrain Tiles, Kenney, three.js, lettertypes).
- [Claude] Foutmeldingen opvangen met een privacyvriendelijke dienst (zonder tracking), zodat crashes van gebruikers zichtbaar worden.
- [Claude] `tools/planner-test/` automatisch laten draaien bij elke push (headless browser), zodat ALLES GOED niet alleen met de hand gecontroleerd wordt.
- [samen] `docs/onderbouwing.md` in de repo zetten.

**Fase C: abonnement**

- [Claude] Abonnement via Apple (StoreKit), met een proefperiode, betaalscherm, herstellen van aankopen. Een dienst als RevenueCat maakt dit en Android later veel eenvoudiger.
- [Claude] Bepalen wat gratis blijft en wat betaald is (zie spoor 3).

**Later (na de lancering)**

- [Claude] Engelse versie (de Nederlandse markt is klein; Engels vergroot het bereik flink).
- [Claude] Android in de Play Store (op Android werkt Web Bluetooth al; met Capacitor is het vooral inpakken).
- [Claude] Ritten naar Apple Gezondheid schrijven; Apple Watch als hartslagmeter.
- [Kees] Strava-API-capaciteit aanvragen zodra er gebruikers zijn.

## Spoor 2: App Store en regels

- [Kees] Apple Developer Program: € 99 per jaar. Als eenmanszaak schrijf je je in als **individu** (Apple accepteert alleen rechtspersonen als organisatie, met een D-U-N-S-nummer). De verkopersnaam in de Store is dan je eigen naam.
- [Kees] Handelaarsstatus (EU, DSA): wie geld verdient, moet in de EU-Store een adres, telefoonnummer en e-mail tonen. Overweeg een zakelijk postadres en een apart nummer als je je huisadres niet openbaar wilt hebben.
- [Kees] In App Store Connect: belasting- en bankgegevens, het betaalde-apps-contract, en aanmelden voor het Small Business Program (15% in plaats van 30% commissie).
- [Claude] Privacybeleid en gebruiksvoorwaarden (Nederlands en Engels), met een medische disclaimer: trainingsadvies, geen medisch advies.
- [Claude] Het privacylabel van Apple invullen (welke gegevens, waarvoor, gekoppeld aan de gebruiker): e-mail, gezondheid (hartslag), fitness (ritten), geen tracking.
- [samen] Verwerkersovereenkomsten nalopen voor Firebase (Google), Cloudflare en eventueel RevenueCat; Firebase-gegevens bij voorkeur in de EU.
- [Claude] Exportverklaring (alleen https, dus vrijgesteld), leeftijdsclassificatie, categorie Gezondheid en fitness.
- [Claude] Strava-merkregels volgen (knop "Connect with Strava", "Powered by Strava").
- [Claude] Merknaam "Kopwerk" nakijken in de registers van BOIP en EUIPO en welke domeinnamen vrij zijn.
- [Kees] Eventueel merk registreren bij het BOIP (Benelux, vanaf ongeveer € 270) als de naam vrij is.

## Spoor 3: Bedrijf en geld

- [Kees] Inschrijven bij de KvK als eenmanszaak (eenmalig ongeveer € 80). Daarmee krijg je een btw-nummer.
- [samen] Btw: Apple verkoopt de app aan de klant en draagt de btw daarover af. Jij factureert in feite aan Apple. Met de kleineondernemersregeling (KOR, tot € 20.000 omzet per jaar) heb je vrijwel geen btw-administratie. Claude zet de keuze op een rij; laat het bij twijfel nakijken door een boekhouder.
- [samen] Inkomstenbelasting: winst uit onderneming of resultaat uit overige werkzaamheden, afhankelijk van uren en omvang. Ondernemersaftrek vraagt 1.225 uur per jaar; dat haal je naast ander werk meestal niet.
- [Kees] Zakelijke bankrekening (mag ook een tweede privérekening, maar een aparte rekening houdt het overzichtelijk).
- [Claude] Eenvoudige boekhouding opzetten: kosten (Apple € 99, domein, Firebase, Cloudflare, eventuele bouwdienst) en inkomsten per maand, in een sheet of boekhoudpakket.
- [samen] Prijs en verdienmodel kiezen. Ter vergelijking (prijzen kort na te checken): Zwift en TrainerRoad rond € 20 per maand, Rouvy en Wahoo SYSTM rond € 15, MyWhoosh gratis. Voorstel om over te beslissen: twee weken of een maand gratis, daarna rond € 7 per maand of € 60 per jaar, met plannen en terugkijken gratis en rijden met de coach betaald.
- [Claude] Begroting: vaste kosten per jaar en hoeveel betalende gebruikers nodig zijn om quitte te spelen.

## Spoor 4: Merk, website en marketing

- [Claude] Merkgids op één pagina: logo, kleuren (`--acc`, zones), lettertypes (Barlow Condensed, Inter), toon (kort en nuchter).
- [Kees] Domeinnaam kopen (bijvoorbeeld kopwerk.app of kopwerk.nl, wat vrij is) en een e-mailadres op dat domein voor support.
- [Claude] Website: een landingspagina met wat Kopwerk is, beelden uit de app, een wachtlijst of TestFlight-aanmelding, plus de pagina's voor privacy, voorwaarden en support (die heeft Apple nodig). De webapp zelf kan op een subdomein blijven.
- [Claude] App Store-pagina: naam, ondertitel, trefwoorden, beschrijving, en screenshots voor iPhone (6,9 inch) en iPad (13 inch), plus eventueel een korte video met de 3D-rit.
- [Kees] Social-media-accounts aanmaken (Instagram, eventueel TikTok of YouTube, een Strava-club) en zelf posten of goedkeuren.
- [Claude] Contentplan voor de eerste drie maanden: korte clips van de Ventoux en de Ronde Hoep, hoe de coach een week bijstuurt, bouwverhalen van een nieuwe route.
- [samen] Bètatesters werven via TestFlight (wielerclubs, vrienden, Nederlandse fietsforums en groepen). Claude schrijft de oproep, Kees plaatst hem.
- [Claude] Persbericht en lijst met Nederlandse fietsmedia en podcasts voor de lancering.

## Mijlpalen

1. **Fundament**: accounts en beslissingen van Kees rond (Apple, KvK, domein, prijs).
2. **TestFlight-bèta**: iOS-app die rijdt, open voor andere gebruikers, privacybeleid online.
3. **Indienen**: abonnement, Store-pagina, screenshots, website live.
4. **Lancering**: publiek in de App Store, aankondiging, eerste maand bijsturen op wat testers en gebruikers zeggen.

## Voorgestelde volgende threads

In deze volgorde, waarbij 1 en 2 tegelijk kunnen lopen:

1. **Bedrijf en accounts opzetten**: een stappenlijst voor Kees (Apple Developer, KvK, domein, bank, handelaarsstatus), plus de beslissingen over prijs en talen.
2. **iOS-app die rijdt**: Capacitor en native Bluetooth, rijden in cijfers op de telefoon, alles offline meegeleverd, eerste build op TestFlight vanaf je Mac.
3. **Klaar voor andere gebruikers**: Firestore-regels per gebruiker, Inloggen met Apple, account verwijderen, toestemming voor hartslag, eerste keer openen, licentiescherm.
4. **Privacy, voorwaarden en merknaam**: privacybeleid, gebruiksvoorwaarden met disclaimer, Apple-privacylabel, merknaamcheck.
5. **Abonnement en prijs**: verdienmodel kiezen, StoreKit of RevenueCat inbouwen, betaalscherm.
6. **Website, Store-pagina en social media**: landingspagina, screenshots en teksten, contentplan, bèta-oproep.

## Tekst voor de projectinstructies

Kopieer dit naar de instructies van het project:

> Dit project runt Kopwerk als klein bedrijf: de app perfectioneren, in de App Store krijgen en alles eromheen (geld, juridisch, merk, website, social media). Het werkplan staat in `docs/ROADMAP.md` in de repo keeshehenkamp/kopwerk; houd daar bij wat af is en wat er besloten is.
>
> - Schrijf in het Nederlands, kort en nuchter. Begin met wat ik moet weten of doen.
> - Voor code gelden `CLAUDE.md` en `README.md` in de repo. Werk op een eigen branch met een pull request; alleen een merge naar `main` zet iets live, en dat doe ik zelf.
> - Eén thread per onderwerp uit de roadmap. Zet bij elke taak of jij het kunt doen of dat ik het moet doen.
> - Doe zelf wat kan. Vraag mij alleen bij geld uitgeven, accounts aanmaken of ondertekenen, iets publiceren of versturen naar buiten, en keuzes die het product of de prijs veranderen. Geef dan één aanbeveling.
> - Bij belasting, juridische en privacyzaken: geef de stand van de regels met bron, en zeg erbij wanneer een boekhouder of jurist het moet nakijken.
> - Teksten voor buiten (Store, website, social) leg je mij eerst voor.
