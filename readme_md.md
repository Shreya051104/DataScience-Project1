# PharmaCare & Analytics Dashboard

A full-stack pharmaceutical tracking system and analytics suite. This project combines a **Flask backend** with SQLite authentication for managing patients and medicine inventory, along with a **data analytics & Power BI pipeline** to analyze drug sales, market share, competitor pricing, and healthcare KPIs across global regions.

---

## 📌 Features

### 1. Patient & Inventory Management (Web / Backend)
- **User Authentication:** Secure user signup and login sessions backed by SQLite.
- **Patient Tracking:** Keep records of patients, clinical conditions, age, and contact information.
- **Medicine & Stock Inventory:** Manage drug entries, batch tracking, stock counts, and expiration dates with automatic cascading user deletion.
- **Tailwind CSS UI:** Styled interfaces built on Tailwind CSS utility classes.

### 2. Pharmaceutical Sales & Market Analytics
- **Drug Performance Metrics:** Track units sold, total revenue, and market share across key therapeutic areas (Oncology, Cardiology, Diabetes, Pulmonology, Rheumatology, Neurology).
- **Competitor Benchmark:** Side-by-side pricing analysis comparing proprietary drug prices against three competitor price tiers.
- **Healthcare & Hospital Insights:** Cross-reference sales with hospital tiers, doctor visits, sales rep visits, insurance coverage, and patient income levels.
- **Regulatory & Safety Monitoring:** Track adverse event frequencies and regulatory flags over monthly time series.
- **Interactive Dashboards:** Includes a Power BI report (`.pbix`) with customized light/dark themes for visual reporting.

---

## 🗂️ Project Structure

```text
├── index.css                # Tailwind CSS entrypoint
├── pharma_dataset.csv       # Pharmaceutical sales & market dataset (or Jupyter notebook analysis)
├── requirements.txt         # Python dependencies
├── database.db              # SQLite database (users, patients, medicines)
├── Report.pbix              # Power BI interactive report and data models
└── README.md                # Project documentation
```

---

## 📊 Database Schema (SQLite)

The relational database includes three primary tables:

1. **`users`**
   - `id`: Integer primary key (Auto-increment)
   - `email`: Text (Unique, required)
   - `password_hash`: Text (Required)

2. **`patients`**
   - `id`: Integer primary key (Auto-increment)
   - `user_id`: Foreign key referencing `users(id)` on delete cascade
   - `name`, `age`, `contact`, `condition`, `created_at`

3. **`medicines`**
   - `id`: Integer primary key (Auto-increment)
   - `user_id`: Foreign key referencing `users(id)` on delete cascade
   - `name`, `batch_number`, `quantity` (CHECK `quantity > 0`), `expiry_date`, `category`, `created_at`

---

## 📈 Dataset Overview (`pharma_dataset.csv`)

The analytics dataset contains 1,500 monthly observation records with 22 attributes:

| Column | Description |
|---|---|
| `drug_id` / `drug_name` | Unique drug code and commercial brand name (e.g., *Immunexa, Diabetrol, Dermasol, ArthroAid, OncoCure*) |
| `therapeutic_area` | Classification (e.g., Oncology, Cardiology, Pulmonology, Diabetes) |
| `molecule_type` | Small Molecule, Biologic, or Biosimilar |
| `region` | Geographic market (North America, Europe, LATAM, APAC) |
| `drug_price` vs `competitor_*_price` | Product price compared against primary competing drugs |
| `units_sold` & `total_revenue` | Sales volumes and generated revenue |
| `marketing_spend` & `rep_visits` | Promotional budget and sales representative engagements |
| `adverse_events` & `regulatory_flags`| Pharmacovigilance safety metrics |
| `market_share` | Estimated percentage share in respective therapeutic class |

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.9+**
- **pip** package manager
- *(Optional)* [Power BI Desktop](https://powerbi.microsoft.com/desktop/) to open `.pbix` reports

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Set Up a Virtual Environment
```bash
# macOS/Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run Data Exploration & Notebooks
To inspect the dataset and cleaning scripts in Jupyter:
```bash
pip install jupyter
jupyter notebook
```

### 5. Running the Web Application
If launching your Flask app:
```bash
export FLASK_APP=app.py    # On Windows: set FLASK_APP=app.py
flask run
```
Access the server at `http://localhost:5000`.

---

## 🛠️ Built With

- **Backend:** [Flask](https://flask.palletsprojects.com/) & [Flask-CORS](https://flask-cors.readthedocs.io/)
- **Data Manipulation:** [Pandas](https://pandas.pydata.org/)
- **Database:** SQLite3
- **Frontend / Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **BI & Visuals:** Microsoft Power BI

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - feel free to modify and use it for educational or commercial purposes.