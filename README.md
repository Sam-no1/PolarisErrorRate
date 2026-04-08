# HPC Error Rate Dashboard

A dashboard for visualizing error rate data from Polaris HPC jobs.

---

## How to Run

Open a terminal and run:

```bash
~/Documents/run_dashboard.sh
```

This will:
- Start the Flask backend (port 5052)
- Start the React frontend (port 5174)
- Automatically open the dashboard in your browser

**To stop:** press `Ctrl + C` in the terminal.

---

## How to Load a New Dataset

1. Click **"Upload Dataset"** in the top-right of the dashboard
2. Select a `.numbers` file from your computer
3. The dashboard will automatically reload with the new data

> The new file must have the same column names as the original (e.g. `EXIT_STATUS`, `SCIENCE_FIELD`, `QUEUE_NAME`, `NODES_USED`, etc.)

---

## File Structure

```
Documents/
├── run_dashboard.sh                        ← single command to run everything
├── README.md                               ← this file
│
├── 337 Assgnments/Assignment 3/dashboard/  ← Flask backend
│   └── app.py
│
└── Research/Fujiwara/error_profiles_react copy 2/  ← React frontend
    └── src/App.jsx
```

---

## Requirements

- Python 3 with `flask` and `numbers_parser` installed
- Node.js with `npm` installed
