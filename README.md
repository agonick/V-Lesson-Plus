![V-Lesson Plus Icon](icons/icon128.png)

# V-Lesson Plus

Estensione Chrome non ufficiale, sviluppata in TypeScript con Manifest V3, pensata per migliorare l'esperienza delle videolezioni su Uninettuno.

Vai a: [Italiano](#italiano) | [English](#english)

## Italiano

### Funzionalità principali

- Mostra l'azione dell'estensione solo nelle pagine di Uninettuno.
- Permette di cambiare velocità di riproduzione dal popup.
- Applica automaticamente l'ultima velocità salvata quando apri una videolezione supportata.
- Permette di salvare marker associati alla lezione corrente e tornare rapidamente a quei punti.
- Mostra etichette marker nel popup e nella timeline del player (tooltip al passaggio del mouse).
- Include una sezione Autoplay separata per aprire automaticamente la lezione successiva al termine del video.
- Supporta il cambio lingua del popup (Italiano/Inglese), con preferenza salvata in `chrome.storage.local`.
- Mostra un banner di avviso quando selezioni velocità 2x.
- Nasconde i dettagli lezione nel popup in uso normale; visibili solo in modalità sviluppo.

### Avviso su tracking e completamento

- Lo strumento è inteso come aiuto alla fruizione delle videolezioni e non come modo per aggirare le regole della piattaforma.
- Velocità di riproduzione elevate (soprattutto 2x) possono risultare in tracciamento incompleto.
- Il tracciamento si basa sul tempo effettivo di fruizione del video.
- Verifica sempre lo stato ufficiale di completamento/tracking prima di fare affidamento sui requisiti d'esame.

### Dettagli lezione in modalità sviluppo

Per visualizzare il pannello dettagli lezione nel popup, abilita il parametro query `devMode` nella pagina popup:

- Valori accettati: `1`, `true`, `yes`, `on`
- Esempio: popup aperto con `?devMode=1`

### Struttura progetto

- `src/`: sorgenti TypeScript
- `dist/`: bundle JavaScript generati da build
- `test/`: test unitari
- `manifest.json`: manifest estensione (punta ai file in `dist/`)

### Installazione locale su Chrome

1. Apri Chrome e vai su `chrome://extensions`.
2. Attiva Modalità sviluppatore in alto a destra.
3. Clicca Carica estensione non pacchettizzata.
4. Seleziona la cartella del progetto.

### Build

1. Installa dipendenze: `npm install`
2. Esegui build completa: `npm run build`
3. I file compilati saranno in `dist/`
4. In sviluppo puoi usare watch mode: `npm run build:watch`

### Test

1. Esegui `npm run build` prima dei test (i test leggono `dist/logic.js`).
2. Esegui `npm test`.
3. I test coprono la logica condivisa, incluse:
	- normalizzazione velocità riproduzione
	- applicazione velocità al player
	- normalizzazione URL lezione
	- formattazione tempi marker
	- validazione etichette marker
	- lettura marker da storage con filtro dei dati invalidi

### Checklist di verifica manuale

1. Apri una pagina su https://www.uninettunouniversity.net/.
2. Verifica che l'icona estensione sia disponibile su quel dominio.
3. Apri il popup e cambia velocità; verifica applicazione al video attivo.
4. Ricarica o apri un'altra lezione supportata e verifica auto-applicazione della velocità salvata.
5. Salva un marker (con o senza etichetta) e verifica jump dal popup.
6. Passa con il mouse sui marker in timeline e verifica tooltip etichetta.
7. Attiva/disattiva Autoplay Next Lesson e verifica il comportamento a fine video.
8. Cambia lingua popup (IT/EN) e verifica le traduzioni.
9. Seleziona 2x e verifica comparsa banner warning tracking.

### Collaborazione e policy

- Guida contributi: [CONTRIBUTING.md](CONTRIBUTING.md)
- Codice di condotta: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Policy sicurezza: [SECURITY.md](SECURITY.md)
- Licenza: [LICENSE](LICENSE)

### Contribuire in 60 secondi

1. Crea un branch: `feature/nome-modifica` (o `fix/nome-modifica`)
2. Applica la modifica
3. Esegui verifiche: `npm run build` e `npm test`
4. Fai push e apri una pull request
5. Usa il template PR e collega eventuale issue

### Licenza

Questo progetto è distribuito con licenza GNU GPL v3.0. Dettagli nel file [LICENSE](LICENSE).

### Autore

- Nome: Agostino Nicotra
- Email: agonick-dev@proton.me

---

## English

Unofficial Chrome extension built with TypeScript and Manifest V3 to improve the Uninettuno videolesson experience.

### Main Features

- Shows extension action only on supported Uninettuno pages.
- Lets you change playback speed from the popup.
- Auto-applies last saved playback speed on supported lesson pages.
- Lets you save lesson markers and jump back to saved times.
- Shows marker labels both in popup list and on the player timeline (hover tooltip).
- Includes a dedicated Autoplay section to open the next lesson automatically when the current video ends.
- Supports popup language switch (Italian/English), stored in `chrome.storage.local`.
- Shows a tracking warning banner when 2x speed is selected.
- Hides lesson details in normal usage; details are shown only in dev mode.

### Tracking Warning

- This tool is not intended as a tracking accelerator.
- Higher playback speeds (especially 2x) may result in incomplete tracking credit.
- Tracking may be based on heartbeat events and effective video watch time.
- The tool is meant to improve videolesson usability, not to cheat or bypass platform rules.
- Always verify official tracking/completion status before relying on exam requirements.

### Lesson Details Dev Mode

To show lesson details panel in popup, use popup query param `devMode`:

- Accepted values: `1`, `true`, `yes`, `on`
- Example: popup opened with `?devMode=1`

### Build and Test

1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Run tests: `npm test`

Tests cover shared logic including playback normalization/apply logic, lesson URL normalization, marker time formatting, label validation, and marker storage filtering.