# 🧬 Protein Interaction Visualizer

Aplikacion për vizualizimin dhe simulimin e ndërveprimit të proteinave në 3D. Kërko strukturat e proteinave, shiko ato në vizualizim 3D dhe simuloni docking ndërmjet dy proteinave.

## Veçoritë

- **Kërkim i proteinave** – Fut një emër ose ID (p.sh. Uniprot) dhe merr strukturën PDB dhe informacionin e proteinës
- **Vizualizim 3D** – Shiko strukturat molekulare me [3Dmol.js](https://3Dmol.org)
- **Simulim docking** – Simuloni ndërveprimin ndërmjet dy proteinave të zgjedhura

## Struktura e projektit

```
protein/
├── frontend/          # Ndërfaqja e përdoruesit (HTML, CSS, JavaScript)
│   ├── index.html
│   ├── style.css
│   └── script.js
├── backend/           # API dhe logjika server (Flask)
│   ├── app.py
│   ├── fetch_structures.py
│   ├── docking.py
│   ├── requirements.txt
│   └── models/        # Skedarët PDB (strukturat e proteinave)
└── README.md
```

## Kërkesat

- **Python** 3.8+
- **Backend:** Flask, Flask-CORS, requests, python-dotenv (shiko `backend/requirements.txt`)
- **Frontend:** Shfletues modern; 3Dmol.js ngarkohet nga CDN

## Instalimi dhe nisja

### 1. Klono ose hap projektin

```bash
cd protein
```

### 2. Backend (Flask)

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
python app.py
```

Shërbyesi do të nisë në `http://localhost:5000` (ose porti që tregon Flask).

### 3. Frontend

Hap `frontend/index.html` drejtpërdrejt në shfletues, ose përdor një shërbyes lokal (p.sh. Live Server) që të shërbejë skedarët nga `frontend/`. Sigurohu që backend të jetë duke u ekzekutuar në portin e konfiguruar (p.sh. 5000) për kërkesat e API.

## Përdorimi

1. **Proteina e parë / e dytë:** Shkruaj emrin ose ID e proteinës dhe kliko për të ngarkuar strukturën dhe të parë në 3D.
2. **Docking:** Pasi të kesh dy proteina të ngarkuara, përdor butonin e dockingut për të simuluar ndërveprimin.

## API (Backend)

| Metodë | Endpoint   | Përshkrim |
|--------|------------|-----------|
| POST   | `/protein` | Kthen strukturën dhe informacionin e proteinës (trupi: `{"protein": "emri_ose_id"}`). |
| POST   | `/dock`    | Ekzekuton simulimin e docking (trupi: `{"file1": "...", "file2": "..."}`). |
| GET    | `/static/<path>` | Shërben skedarët statikë nga `models/`. |

## Licensa

Projekt edukativ / personal. Përdor sipas nevojës.
