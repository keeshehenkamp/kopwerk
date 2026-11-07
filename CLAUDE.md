# Kopwerk: werkafspraken

Fietstrainingsapp zonder build-stap; zie `README.md` voor de opbouw. Taal in de app: Nederlands, kort en nuchter.

## Ontwerpregels

Elk scherm moet in één blik te lezen zijn. Loop deze lijst na vóór je een scherm oplevert, ook als het alleen om een klein scherm gaat.

1. **Rangorde.** Niet alles op dezelfde manier: één ding het grootst, daarna hooguit twee of drie cijfers, de rest klein op één regel. Vraag per scherm: wat wil ik hier in één seconde weten, en wat moet ik doen?
2. **Cijfers voorop, weinig tekst.** Geen uitlegzinnen als het cijfer of de kop genoeg zegt. Koppen zijn kort ("Wisselen", niet "Andere training, zelfde idee").
3. **Geen vakken om cijfers.** Geen kaders, tegels of gekleurde zijbalkjes. Scheiden doe je met ruimte. Een kaart alleen waar hij echt iets bij elkaar houdt.
4. **Eén geheel.** Bij elkaar horende getallen staan dicht bij elkaar op één lijn, de uitleg direct onder het cijfer ("watt · doel 155"). Geen losse labels ver boven het getal.
5. **Kleur betekent iets.** Groen, oranje of rood alleen voor "zit ik goed", samen met een pijl de kant op die je moet. Waar het er niet toe doet (warming-up, herstel, cooling-down) blijft het neutraal.
6. **Bijzaken klein.** Hartslag, snelheid en afstand zijn leuk om te zien, niet belangrijk.
7. **Een hoofdknop per scherm.** Andere acties zijn rustig of klein.
8. **Scrollen in plaats van tikken.** Geen pijltjes voor weken of maanden als een doorlopende lijst ook kan.
9. **Geen gegenereerde look.** Geen standaard kaartjes-met-randje-en-grijze-zin. Huisstijl Koers: Barlow Condensed voor koppen en cijfers, Inter voor tekst, oranjerood (`--acc`) als accent.

## Coach en planning

- De planner haalt het meeste uit de tijd die je hebt. Meer tijd alleen adviseren als dat echt nodig is.
- De planning verandert elke week: niet verder vooruit tonen dan deze en volgende week.
- Op zondag vraagt de app de tijd voor volgende week.
- Het doel of evenement bepaalt de trainingen. De planner verandert het schema uit zichzelf en zegt dat erbij: fase uit wat je echt reed, rustig terug na een gat, kiezen wat te weinig gedaan is, accent verschuiven als FTP-tests niet stijgen, vandaag aanpassen op gevoel en vorm.
- Alleen piek en afbouw hangen aan de datum van het evenement. Daarvoor telt wat je echt reed: een herstelweek is verdiend, en een week met bijna niets begint de opbouw opnieuw.
- Gevoel en hartslag beslissen samen. Eén rit verandert alleen de volgende zware training, twee of drie ritten de week, een trend de fase. Lichter en zwaarder doet de planner zelf; om meer tijd dan je opgaf vraagt hij.
- Realistisch blijven: een duurrit is minimaal ongeveer anderhalf uur in zone 2, een lange rit hoeft niet langer dan drie en een half uur. Meer tijd adviseren alleen als er echt te weinig is, en niet elke week.
- Tijd invullen: deze week alleen via de klok op Home, volgende week via Kalender (en de vraag op zondag). Geen extra knoppen die hetzelfde doen.
- Hardlopen telt mee in vermoeidheid en fitheid en in hoe zwaar de dag erna mag zijn, niet in je FTP. De belasting komt uit snelheid en gevoel (`runLoad`).
- Een slimme planner betekent niet veel informatie. Wisselen is één knop op dezelfde plek, zonder lijst of extra uitleg (`PACKS`: pakketten van minstens vier trainingen met hetzelfde doel). De dag blijft even lang en even zwaar bedoeld.
- Vandaag staat op Home en niet ook nog in Kalender.
- De coach zegt op Home één ding tegelijk, in één regel: wat hij zag en wat er daardoor verandert.
- Het doel is beter worden: wat de app meet, moet de planning veranderen en niet alleen tekst opleveren. Een training die voelt zoals verwacht wordt langzaam zwaarder; zwaarte is altijd relatief aan het verwachte gevoel van die soort. Herstel- en duurritten worden niet zwaarder.

## Niet doen

- Tredes (de ladder per soort training) zijn voor de planner: niet tonen in de app.
- Meldingen op de telefoon en een wekelijkse terugblik zijn afgewezen.
- Groepsrit: alleen echte rijders, geen groepje of fietsers langs de weg.
- 3D-model van de fietser en de wereld: voorlopig laten zoals het is.

## Werkwijze

- Controleer een wijziging in de browser op telefoon- en laptopformaat, licht en donker, met de demomodus voor het rijscherm.
- Verhoog het versienummer (`?v=`) in `index.html` bij elke wijziging aan css of js.
- Committen en pushen alleen als Kees daarom vraagt; pushen zet het meteen live.
