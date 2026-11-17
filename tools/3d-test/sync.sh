#!/bin/zsh
# Zet een testkopie van de app in een map buiten Bureaublad (je scratchpad) en geeft elk bestand een nieuw versienummer.
# Gebruik:  tools/3d-test/sync.sh <doelmap>      daarna: python3 <doelmap>/serve.py 8779 <doelmap>/app <doelmap>/shot
# Opnieuw draaien na elke wijziging; de server hoeft niet opnieuw gestart.
set -e
BRON="${0:A:h:h:h}"; DOEL="${1:?geef een doelmap, bijvoorbeeld je scratchpad}"
mkdir -p "$DOEL/app" "$DOEL/shot"
rsync -a --delete --exclude .git --exclude docs "$BRON/" "$DOEL/app/"
cp "$BRON/tools/3d-test/serve.py" "$DOEL/serve.py"
T=t$(date +%s); sed -i '' -E "s/\?v=[0-9a-z]+/?v=$T/g" "$DOEL/app/index.html"
echo "testkopie $T in $DOEL/app"
