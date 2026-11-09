# Kopwerk: werkafspraken

Fietstrainingsapp zonder build-stap; zie `README.md` voor de opbouw. Taal in de app: Nederlands, kort en nuchter.

## Ontwerpregels

Elk scherm moet in één blik te lezen zijn. Loop deze lijst na vóór je een scherm oplevert, ook als het alleen om een klein scherm gaat.

1. **Rangorde.** Niet alles op dezelfde manier: één ding het grootst, daarna hooguit twee of drie cijfers, de rest klein op één regel. Vraag per scherm: wat wil ik hier in één seconde weten, en wat moet ik doen?
2. **Cijfers voorop, weinig tekst.** Geen uitlegzinnen als het cijfer of de kop genoeg zegt. Koppen zijn kort ("Wisselen", niet "Andere training, zelfde idee").
3. **Geen vakken om cijfers.** Geen kaders, tegels of gekleurde zijbalkjes. Scheiden doe je met ruimte. Een kaart alleen waar hij echt iets bij elkaar houdt.
4. **Eén geheel.** Bij elkaar horende getallen staan dicht bij elkaar op één lijn, de uitleg direct onder het cijfer ("watt · doel 155"). Geen losse labels ver boven het getal.
5. **Veel contrast, kleur klein.** Cijfers en koppen zijn zwart (in donker wit). Kleur staat alleen in kleine accenten: een blokje bij het label, een icoon, een stip, lijnen en balken in grafieken. Gebruik de tinten van het logo en de zones (`--z*`, `--acc`), geen eigen gemengde tinten. Vast per onderdeel: FTP en records oranjerood, fitheid blauw, vermoeidheid paars, goed en gereden groen. Op het rijscherm blijft groen, oranje of rood voor "zit ik goed", samen met een pijl de kant op die je moet.
6. **Bijzaken klein.** Hartslag, snelheid en afstand zijn leuk om te zien, niet belangrijk. Gebruik een icoontje waar dat een woord kan vervangen (`I`, Lucide). Uitleg alleen achter uitklappen, en dan alleen als het echt iets toevoegt.
7. **Een hoofdknop per scherm.** Andere acties zijn rustig of klein.
8. **Scrollen in plaats van tikken.** Geen pijltjes voor weken of maanden als een doorlopende lijst ook kan.
9. **Geen gegenereerde look.** Geen standaard kaartjes-met-randje-en-grijze-zin. Huisstijl Koers: Barlow Condensed voor koppen en cijfers, Inter voor tekst, oranjerood (`--acc`) als accent.

## Coach en planning

- De planner haalt het meeste uit de tijd die je hebt. Meer tijd alleen adviseren als dat echt nodig is, in één korte zin zonder uitleg.
- Vrije tijd later in de week blijft niet leeg omdat er eerder een training gemist is: een gemiste dag telt niet als gebruikte trainingsdag of tijd.
- De planning verandert elke week: niet verder vooruit tonen dan deze en volgende week.
- Op zondag vraagt de app de tijd voor volgende week.
- Het doel of evenement bepaalt de trainingen. De planner verandert het schema uit zichzelf en zegt dat erbij: fase uit wat je echt reed, rustig terug na een gat, kiezen wat te weinig gedaan is, accent verschuiven als FTP-tests niet stijgen, vandaag aanpassen op gevoel en vorm.
- Alleen piek en afbouw hangen aan de datum van het evenement. Daarvoor telt wat je echt reed: een herstelweek is verdiend, en een week met bijna niets begint de opbouw opnieuw.
- Gevoel en hartslag beslissen samen. Eén rit verandert alleen de volgende zware training, twee of drie ritten de week, een trend de fase. Lichter en zwaarder doet de planner zelf; om meer tijd dan je opgaf vraagt hij.
- Zonder evenement werk je in doelblokken van twaalf weken. De coach kiest het doel zelf (de gebruiker hoeft niets te bedenken), de laatste week is een testweek, daarna begint het volgende blok.
- Een langere rit is geen korte rit met zone 2 erachter: meer werk, blokken uit elkaar, een eigen tweede soort werk per training, geen lange vlakke stukken.
- Realistisch blijven: een duurrit is minimaal ongeveer anderhalf uur in zone 2, een lange rit hoeft niet langer dan drie en een half uur. Meer tijd adviseren alleen als er echt te weinig is, en niet elke week.
- Tijd invullen: deze week alleen via de klok op Home, volgende week via Kalender (en de vraag op zondag). Geen extra knoppen die hetzelfde doen.
- Een training afronden gaat altijd via dezelfde stappen: in de app gereden (gaat vanzelf), of via `logModal`: wat je deed (rit importeren, gefietst maar niet opgenomen met tijd en km, hardlopen, kracht, iets anders), de gegevens, hoe zwaar het was. Daarna toont het ritscherm de analyse en wat er in het schema verandert (`planDiff`). Geen andere ingangen of vensters die hetzelfde doen. Een fietsrit wordt vergeleken met de training van die dag: met vermogen op de blokken (`matchPlan`), zonder vermogen op tijd en gevoel (`matchFeel`, de ladder beweegt dan niet). De belasting van een buitenrit zonder vermogen komt uit duur maal gevoel, op je eigen lijn uit je trainerritten (`feelLine`); snelheid telt niet mee.
- Hardlopen telt mee in vermoeidheid en fitheid en in hoe zwaar de dag erna mag zijn, niet in je FTP. De belasting komt uit snelheid en gevoel (`runLoad`).
- Een slimme planner betekent niet veel informatie. Wisselen is één knop op dezelfde plek, zonder lijst of extra uitleg (`PACKS`: pakketten van minstens vier trainingen met hetzelfde doel). De dag blijft even lang en even zwaar bedoeld.
- Vandaag staat op Home en niet ook nog in Kalender.
- Onder Geweest in Kalender alleen wat je echt deed (geen gemiste trainingen), per week ingeklapt. Nog in te vullen trainingen staan op Home.
- De coach zegt op Home één ding tegelijk, in één regel: wat hij zag en wat er daardoor verandert.
- Onderbouwing: `docs/onderbouwing.md` geeft per regel het oordeel onderbouwd, deels of vuistregel, met bron en wat er echt gelezen is. Een nieuwe of gewijzigde regel krijgt daar een bron of het label vuistregel. Noem een vuistregel nooit bewezen.
- Een FTP is een schatting met marge (`ftpMargin`). Een verschil onder 5 W gaat niet vanzelf (`ftpAdopt`). Eén 20-minutentest naast de ramptest geeft je eigen verhouding (`calibrate`). Uit ritten gaat 20 minuten voor.
- Niet testen als het zwaar voelt: drie ritten zwaar, of twee zwaar met een lage hartslag, geeft eerst vier lichtere dagen (`easeWalk`). Pas als het binnen drie weken terugkomt een herstelweek.
- Belastingsratio en vorm zijn informatie: de ratio telt alleen buiten je schema en als het ook zwaar voelt, een lage vorm maakt nooit in zijn eentje iets lichter. Een rit veel langer dan je langste van 30 dagen is alleen een melding (`longJump`).
- Terug na een gat (`comeback`): 7-13 dagen een paar rustige dagen, 14-28 een stap terug en een lichtere week, langer twee stappen en een FTP-test. Een drukke week is geen waarschuwing.
- Blokken van 8 minuten hebben een vaste plek bij de doelen FTP en Gewoon beter worden (`vast`). Sweet spot is een gebied op gevoel, duurritten zitten onder in zone 2.
- Het doel van een blok heeft een marge (`blockBand`) en een eindtest daarbinnen telt als gehaald (`blockHit`). De afbouw houdt een korte, harde prikkel en ongeveer evenveel ritten.
- Het doel is beter worden: wat de app meet, moet de planning veranderen en niet alleen tekst opleveren. Een training die voelt zoals verwacht wordt langzaam zwaarder; zwaarte is altijd relatief aan het verwachte gevoel van die soort. Herstel- en duurritten worden niet zwaarder.

## Niet doen

- Tredes (de ladder per soort training) zijn voor de planner: niet tonen in de app.
- Meldingen op de telefoon en een wekelijkse terugblik zijn afgewezen. Ook geen vaste teksten die je vragen je tijd na te kijken ("Klopt je tijd nog?").
- Groepsrit: alleen echte rijders, geen groepje of fietsers langs de weg.
- 3D-model van de fietser en de wereld: voorlopig laten zoals het is.

## Werkwijze

- Voor elke push die de planner of de trainingen raakt: open `tools/planner-test/` via een lokale webserver. Bovenaan moet ALLES GOED staan. Is dat niet zo, dan gaat er niets online.
- Elke klacht over een training of de planner wordt eerst een regel in `tools/planner-test/checks.js` die de fout vindt, en wordt daarna pas opgelost. Zo komt dezelfde fout niet terug.
- Bouw je nieuwe trainingen, kijk dan ook naar de inhoud op meerdere duren (1 uur, 2 uur), niet alleen of ze foutloos laden en de juiste lengte hebben.
- Controleer een wijziging in de browser op telefoon- en laptopformaat, licht en donker, met de demomodus voor het rijscherm.
- Verhoog het versienummer (`?v=`) in `index.html` bij elke wijziging aan css of js.
- Committen en pushen alleen als Kees daarom vraagt; pushen zet het meteen live.
