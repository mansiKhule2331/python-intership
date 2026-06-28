from flask import Flask, render_template, request, redirect
import sqlite3

app = Flask(__name__)

# Initialize Database
def init_db():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        rating INTEGER,
        comments TEXT
    )
    """)

    conn.commit()
    conn.close()


# Home Page
@app.route("/")
def index():
    return render_template("index.html")


# Feedback Form Page
@app.route("/feedback")
def feedback():
    return render_template("feedback.html")


# Submit Feedback
@app.route("/submit-feedback", methods=["POST"])
def submit_feedback():
    name = request.form["name"]
    email = request.form["email"]
    rating = request.form["rating"]
    comments = request.form["comments"]

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO feedback (name, email, rating, comments) VALUES (?, ?, ?, ?)",
        (name, email, rating, comments)
    )

    conn.commit()
    conn.close()

    return redirect("/admin-dashboard")


# Admin Dashboard
@app.route("/admin-dashboard")
def admin_dashboard():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM feedback")
    data = cursor.fetchall()

    conn.close()

    return render_template("admin_dashboard.html", feedback=data)


if __name__ == "__main__":
    init_db()
    app.run(debug=True)