"""
seed_demo.py - populates the 87 empty tables so every portal screen shows real content.
Idempotent: only seeds tables that are still empty. Safe to re-run.
Run:  python backend/seed_demo.py
"""
import sqlite3
import os
import random
from datetime import datetime, timedelta

BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, "student_system.db")
random.seed(42)
NOW = datetime.now()

def d(days, fmt="%Y-%m-%d"):
    return (NOW + timedelta(days=days)).strftime(fmt)

def dt(days, hh=9, mm=0):
    return d(days) + " %02d:%02d:00" % (hh, mm)

conn = sqlite3.connect(DB, timeout=30, check_same_thread=False, isolation_level=None)
conn.execute("PRAGMA busy_timeout=30000")
c = conn.cursor()

def count(table):
    return c.execute("SELECT COUNT(*) FROM %s" % table).fetchone()[0]

def maybe(table):
    """returns True if seeding should proceed"""
    return count(table) == 0

def ins(sql, rows):
    c.executemany(sql, rows)

# ------------------------------------------------------------------ academic
if maybe("assignments"):
    ins("INSERT INTO assignments (title, description, due_date, created_by, created_at) VALUES (?,?,?,?,?)", [
        ("Sorting Algorithms Report", "Implement and compare bubble, merge and quick sort with runtime graphs.", d(5), 2, dt(-9)),
        ("ER Diagram for College DB", "Design an ER model with at least 10 entities and normalise to 3NF.", d(7), 2, dt(-7)),
        ("CPU Scheduling Simulation", "Simulate FCFS, SJF and Round Robin on a given process mix.", d(10), 3, dt(-5)),
        ("Subnetting Worksheet", "Solve the 10 VLSM problems from the class handout and show working.", d(3), 3, dt(-4)),
        ("KNN Classifier Notebook", "Train KNN on the iris dataset; report accuracy for k=1..9.", d(12), 4, dt(-2)),
        ("SRS Document Draft", "Write the software requirements spec for the library module.", d(14), 4, dt(-1)),
    ])
if maybe("assignment_submissions"):
    ins("INSERT INTO assignment_submissions (assignment_id, student_id, status, notes, updated_at, file_name, grade_score, grade_feedback, graded_by, graded_at) VALUES (?,?,?,?,?,?,?,?,?,?)", [
        (1, 1, "completed", "Python notebook attached", dt(-3), "sorting_report.zip", 27, "Excellent comparison; add space complexity next time.", 2, dt(-2)),
        (2, 1, "submitted", "3NF achieved for 10 entities", dt(-1), "er_diagram.pdf", None, None, None, None),
        (4, 1, "submitted", "Q1-Q7 done, Q8 Q9 Q10 pending revision", dt(-1), "subnet_worksheet.pdf", None, None, None, None),
    ])
if maybe("quizzes"):
    ins("INSERT INTO quizzes (title, topic, difficulty, created_by, created_at) VALUES (?,?,?,?,?)", [
        ("DSA Quiz 1", "Time complexity & linked lists", "intermediate", 2, dt(-10)),
        ("RDBMS Quiz", "Normalisation & joins", "intermediate", 2, dt(-6)),
        ("Networks Basics", "OSI layers & subnetting", "basic", 3, dt(-3)),
        ("ML Fundamentals", "Bias-variance & KNN", "advanced", 4, dt(-2)),
    ])
if maybe("quiz_questions"):
    qz = dict(c.execute("SELECT id, title FROM quizzes").fetchall())
    rows = []
    qlists = {
        1: [("Worst case of quicksort?", "O(n log n)", "O(n^2)", "O(n)", "O(log n)", "B"),
            ("Which structure gives O(1) insertion at head?", "Array", "Singly linked list", "Hash map", "Binary tree", "B"),
            ("Big-O of binary search?", "O(n)", "O(log n)", "O(n log n)", "O(1)", "B")],
        2: ("2", [("3NF removes what?", "Partial dependency", "Transitive dependency", "Duplicates", "Joins", "B")]),
        3: ("3", [("Which layer does TCP live on?", "Application", "Network", "Transport", "Data link", "c")]),
        4: ("4", [("High variance means", "Underfitting", "Overfitting", "Perfect fit", "No data", "B")]),
    }
    # simpler: three questions for quiz 1, one each for others
    rows += [(qz.get("DSA Quiz 1") or list(qz.values())[0],) + qk for qk in [
        ("Worst case of quicksort?", "O(n log n)", "O(n^2)", "O(n)", "O(log n)", "B"),
        ("Which structure gives O(1) insertion at head?", "Array", "Singly linked list", "Hash map", "Binary tree", "B"),
        ("Big-O of binary search?", "O(n)", "O(log n)", "O(n log n)", "O(1)", "B")]]
    for title, qs in [("RDBMS Quiz", [("3NF removes...", "Partial", "Transitive", "Duplicate", "Joins", "B")]),
                      ("Networks Basics", [("TCP lives on which layer?", "App", "Network", "Transport", "Data link", "C")]),
                      ("ML Fundamentals", [("High variance means...", "Underfit", "Overfit", "Perfect", "No data", "B")])]:
        if title in qz:
            rows += [(qz[title],) + qk for qk in qs]
    ins("INSERT INTO quiz_questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?,?,?,?,?,?,?)", rows)
if maybe("quiz_submissions"):
    ins("INSERT INTO quiz_submissions (quiz_id, student_id, score, total_questions, submitted_at) VALUES (?,?,?,?,?)", [
        (1, 1, 2, 3, dt(-9, 15)), (2, 1, 1, 1, dt(-5, 16)), (3, 1, 1, 1, dt(-2, 11)),
    ])
if maybe("exam_schedules"):
    ins("INSERT INTO exam_schedules (subject_id, exam_date, start_time, end_time, room_number, exam_type, created_at) VALUES (?,?,?,?,?,?,?)", [
        (1, d(21), "09:30", "12:30", "A-201", "Internal", dt(-10)),
        (2, d(23), "09:30", "12:30", "A-201", "Internal", dt(-10)),
        (3, d(25), "14:00", "17:00", "B-104", "Internal", dt(-10)),
    ])
if maybe("student_subject_grades"):
    ins("INSERT INTO student_subject_grades (student_id, subject_id, credits, grade_points, marks, status, faculty_user_id, remarks, updated_at) VALUES (?,?,?,?,?,?,?,?,?)", [
        (1, 1, 4, 9, 91, "passed", 2, "Strong fundamentals", dt(-15)),
        (1, 2, 4, 8, 84, "passed", 2, "Good, revise normalization", dt(-15)),
        (1, 3, 4, 7, 77, "passed", 3, "Needs practice on deadlock", dt(-15)),
        (1, 4, 3, 8, 86, "passed", 3, "Excellent in subnetting", dt(-15)),
        (1, 5, 3, 6, 68, "passed", 4, "Improve math for ML", dt(-15)),
    ])
if maybe("semester_records"):
    ins("INSERT INTO semester_records (student_id, semester_number, cgpa, attendance_pct, internal_marks_avg, created_at) VALUES (?,?,?,?,?,?)", [
        (1, 1, 8.4, 88.0, 74.5, dt(-100)),
        (1, 2, 8.2, 90.5, 76.0, dt(-70)),
        (1, 3, 8.1, 87.2, 81.2, dt(-20)),
    ])
if maybe("student_gpa"):
    ins("INSERT INTO student_gpa (student_id, semester, gpa, credits_earned, backlogs) VALUES (?,?,?,?,?)", [
        (1, 1, 8.4, 22, 0), (1, 2, 8.2, 24, 0), (1, 3, 8.1, 19, 1),
    ])
if maybe("notes"):
    ins("INSERT INTO notes (course, file, uploaded_at) VALUES (?,?,?)", [
        ("Python Programming", "py_unit3_tuples_sets.pdf", dt(-8)),
        ("DBMS", "dbms_module2_normalization.pdf", dt(-6)),
        ("Operating Systems", "os_deadlock_notes.pdf", dt(-4)),
    ])
if maybe("study_materials"):
    ins("INSERT INTO study_materials (subject_id, title, material_type, url, description, created_by, created_at) VALUES (?,?,?,?,?,?,?)", [
        (1, "Python Crash Course slides", "ppt", "#", "Units 1-3 condensed deck", 2, dt(-9)),
        (2, "SQL practice set", "pdf", "#", "40 join & subquery problems", 2, dt(-7)),
        (3, "Deadlock handout", "pdf", "#", "Bankers algorithm worked examples", 3, dt(-5)),
        (5, "ML math primer", "pdf", "#", "Linear algebra + stats refresher", 4, dt(-3)),
    ])
if maybe("learning_resources"):
    ins("INSERT INTO learning_resources (subject, title, resource_type, content_url, description, created_by, created_at) VALUES (?,?,?,?,?,?,?)", [
        ("Python Programming", "W3Schools Python", "link", "https://www.w3schools.com/python/", "Free reference tutorial", 2, dt(-9)),
        ("Database Management Systems", "SQLBolt", "link", "https://sqlbolt.com/", "Interactive SQL lessons", 2, dt(-8)),
        ("Operating Systems", "OSTEP book", "note", "https://pages.cs.wisc.edu/~remzi/OSTEP/", "Free OS textbook", 3, dt(-6)),
        ("Machine Learning", "StatQuest videos", "video", "https://www.youtube.com/@statquest", "Visual ML explainers", 4, dt(-2)),
    ])
if maybe("flashcards"):
    ins("INSERT INTO flashcards (subject_id, question, answer, created_at) VALUES (?,?,?,?)", [
        (1, "What does pass do?", "Null statement - no operation", dt(-7)),
        (2, "What is a primary key?", "Column(s) uniquely identifying a row, NOT NULL", dt(-7)),
        (3, "Define deadlock", "Cycle of processes each waiting on the others resource", dt(-5)),
        (4, "What is a subnet mask?", "Bitmask splitting IP into network and host parts", dt(-4)),
        (5, "What is overfitting?", "Model memorises training data; poor generalisation", dt(-3)),
        (2, "Difference between DELETE and TRUNCATE?", "DELETE is row-wise logged DML; TRUNCATE resets table fast", dt(-2)),
    ])
if maybe("lecture_recordings"):
    ins("INSERT INTO lecture_recordings (subject_id, title, video_url, duration_minutes, recorded_at) VALUES (?,?,?,?,?)", [
        (1, "Unit 3 - Tuples & Dictionaries", "#", 46, dt(-9)),
        (2, "Normalization walkthrough", "#", 52, dt(-7)),
        (3, "Bankers algorithm demo", "#", 38, dt(-4)),
    ])
if maybe("lesson_plans"):
    ins("INSERT INTO lesson_plans (faculty_id, subject_id, topic, week_number, learning_outcomes, status, created_at) VALUES (?,?,?,?,?,?,?)", [
        (1, 1, "Comprehensions & lambda", 6, "Students write list/dict comprehensions", "completed", dt(-8)),
        (1, 2, "Functional dependencies", 7, "Find candidate keys and 3NF decompose", "planned", dt(-5)),
        (2, 3, "Virtual memory", 7, "Explain paging vs segmentation", "completed", dt(-4)),
        (3, 5, "Gradient descent", 6, "Derive update rule; implement in numpy", "completed", dt(-3)),
    ])
if maybe("academic_calendar_events"):
    ins("INSERT INTO academic_calendar_events (title, event_type, starts_at, ends_at, description, subject_id, created_by, target_role, created_at) VALUES (?,?,?,?,?,?,?,?,?)", [
        ("Midterm Exams Begin", "exam", d(21), d(29), "Midterm exam window for sem 3", None, 1, "all", dt(-12)),
        ("Tech Fest", "other", d(35), d(36), "Inter-college hackathon and robotics expo", None, 1, "all", dt(-10)),
        ("Project Review 2", "meeting", d(14), d(14), "Second evaluation for major projects", None, 1, "faculty", dt(-6)),
        ("Library Week", "other", d(8), d(12), "Book fair and reading challenge", None, 1, "all", dt(-4)),
        ("Girls Hostel Day", "other", d(18), d(18), "Hostel cultural evening", None, 1, "all", dt(-2)),
    ])
if maybe("announcements"):
    ins("INSERT INTO announcements (message, created_at) VALUES (?,?)", [
        ("Midterm exam timetable is now live on your dashboard.", dt(-10)),
        ("Digital Library has new Engineering titles - check Library section.", dt(-7)),
        ("Campus Connect is live for all departments; keep discussions professional.", dt(-5)),
        ("Hostel fee payment window closes at end of this month.", dt(-3)),
    ])
if maybe("campus_events"):
    ins("INSERT INTO campus_events (title, description, event_date, is_live, stream_url, created_at) VALUES (?,?,?,?,?,?)", [
        ("Annual Hackathon", "24 hour team coding contest", d(35), 0, None, dt(-8)),
        ("Guest Lecture: Cloud Careers", "Alumni panel on cloud engineering roles", d(2), 0, None, dt(-5)),
        ("Inter-department Cricket", "Knockout tournament begins", d(12), 0, None, dt(-2)),
    ])

# ------------------------------------------------------------------ projects
if maybe("projects"):
    ins("INSERT INTO projects (title, description, student_id, guide_user_id, status, progress, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)", [
        ("Smart Campus Analytics", "Dashboard predicting weak students from attendance & study hours.", 1, 2, "in_progress", 60, dt(-45), dt(-1)),
        ("Campus Voice Kiosk", "Speech interface for hostel complaints and notices.", 1, 4, "in_progress", 25, dt(-20), dt(-3)),
    ])
if maybe("project_milestones"):
    pids = [r[0] for r in c.execute("SELECT id FROM projects").fetchall()]
    if pids:
        ins("INSERT INTO project_milestones (project_id, title, due_date, status, created_at) VALUES (?,?,?,?,?)", [
            (pids[0], "Data pipeline prototype", d(-10), "completed", dt(-45)),
            (pids[0], "Model training + evaluation", d(4), "in_progress", dt(-30)),
            (pids[0], "Dashboard release", d(20), "pending", dt(-30)),
            (pids[1], "Voice corpus collection", d(6), "in_progress", dt(-20)),
        ])
if maybe("project_updates"):
    pids = [r[0] for r in c.execute("SELECT id FROM projects").fetchall()]
    if pids:
        ins("INSERT INTO project_updates (project_id, author_type, author_user_id, progress, note, created_at) VALUES (?,?,?,?,?,?)", [
            (pids[0], "student", 5, 60, "Pipeline ready; first accuracy 84 percent.", dt(-1)),
            (pids[0], "faculty", 2, 60, "Good pace - tighten dataset cleaning before review 2.", dt(-1, 12)),
            (pids[1], "student", 5, 25, "Collected 200 audio samples for hostel intents.", dt(-3)),
        ])
if maybe("project_discussion"):
    pids = [r[0] for r in c.execute("SELECT id FROM projects").fetchall()]
    if pids:
        ins("INSERT INTO project_discussion (project_id, author_type, author_user_id, message, created_at) VALUES (?,?,?,?,?)", [
            (pids[0], "student", 5, "Guide, can we use SMOTE for the class imbalance?", dt(-2)),
            (pids[0], "faculty", 2, "Yes, but compare with class-weights baseline.", dt(-2, 14)),
        ])
if maybe("faculty_remarks"):
    ins("INSERT INTO faculty_remarks (student_id, faculty_user_id, remark, created_at) VALUES (?,?,?,?)", [
        (1, 2, "Very consistent in lab work; good debugging habits.", dt(-8)),
        (1, 3, "Participates well but submit worksheets earlier.", dt(-5)),
        (1, 4, "Showed initiative in choosing the ML dataset.", dt(-3)),
    ])
if maybe("observation_reports"):
    ins("INSERT INTO observation_reports (faculty_user_id, student_id, week_start, week_label, observation, strengths, areas_to_improve, rating, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", [
        (2, 1, d(-14), "Week 6", "Active in class; answered complexity questions correctly.", "DSA clarity", "Careless SQL joins", 4, dt(-13), dt(-13)),
        (3, 1, d(-7), "Week 7", "Submitted OS assignment on time.", "Discipline", "Revise virtual memory", 4, dt(-6), dt(-6)),
        (4, 1, d(0), "Week 8", "Started ML notebook early.", "Initiative", "Statistical intuition", 4, dt(-1), dt(-1)),
    ])
if maybe("faculty_feedback"):
    ins("INSERT INTO faculty_feedback (faculty_id, student_id, rating, comments, created_at) VALUES (?,?,?,?,?)", [
        (1, 1, 5, "Clear explanations during project guidance meetings.", dt(-6)),
        (3, 1, 4, "Helpful office hours.", dt(-4)),
    ])
if maybe("faculty_performance"):
    ins("INSERT INTO faculty_performance (faculty_id, avg_rating, feedback_count, analytics_json) VALUES (?,?,?,?)", [
        (1, 4.7, 18, '{"trend":"up","peer_avg":4.4}'), (2, 4.3, 12, '{"trend":"flat"}'), (3, 4.8, 21, '{"trend":"up"}'),
    ])
if maybe("faculty_research"):
    ins("INSERT INTO faculty_research (faculty_id, title, publication_type, journal_name, publication_date, url, status, created_at) VALUES (?,?,?,?,?,?,?,?)", [
        (1, "Ensemble Methods for Weak-Student Early Alerts", "Journal", "Intl J of EdTech", d(-40), "#", "published", dt(-50)),
        (2, "Efficient Page Replacement on Flash", "Paper", "ACM SAC", d(-120), "#", "published", dt(-130)),
        (3, "Applying CNNs to Campus Security Feeds", "Paper", "arXiv", d(-20), "#", "under_review", dt(-25)),
    ])
if maybe("class_plans"):
    ins("INSERT INTO class_plans (faculty_user_id, class_name, subject, schedule_time, syllabus_url, completion_pct, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)", [
        (2, "CSE Sem 3 - A", "Python Programming", "Mon Wed Fri 09:30", "#", 45, "ongoing", dt(-40), dt(-1)),
        (2, "CSE Sem 3 - A", "Database Management Systems", "Tue Thu 11:00", "#", 38, "ongoing", dt(-40), dt(-1)),
        (3, "CSE Sem 3 - A", "Operating Systems", "Mon Thu 14:00", "#", 41, "ongoing", dt(-40), dt(-1)),
        (4, "CSE Sem 3 - A", "Machine Learning", "Wed Fri 15:30", "#", 30, "ongoing", dt(-40), dt(-1)),
    ])

# ------------------------------------------------------------------ analytics / AI
if maybe("student_metrics_history"):
    rows = []
    for i in range(12, 0, -1):
        rows.append((1, 86 + (i % 5), 3.5 if i % 2 else 5.0, 7.0 if i % 3 else 6.5, 78 + (i % 4), dt(-i)))
    ins("INSERT INTO student_metrics_history (student_id, attendance, study_hours, sleep_hours, predicted_marks, created_at) VALUES (?,?,?,?,?,?)", rows)
if maybe("alerts"):
    ins("INSERT INTO alerts (student_id, level, score, predicted_marks, reason, created_at) VALUES (?,?,?,?,?,?)", [
        (1, "medium", 41.0, 78, "Attendance dipped below 87 while study hours fell to 3.5.", dt(-3)),
        (1, "low", 12.0, 82, "Minor drop in ML quiz score.", dt(-1)),
    ])
if maybe("interventions"):
    ins("INSERT INTO interventions (student_id, risk_level, action_plan, status, created_at) VALUES (?,?,?,?,?)", [
        (1, "medium", "Weekly 30-minute mentoring with guide; focus on Machine Learning math.", "in_progress", dt(-3)),
    ])
if maybe("intelligent_alerts"):
    ins("INSERT INTO intelligent_alerts (student_id, recipient_role, recipient_id, category, severity, message, source_key, created_at) VALUES (?,?,?,?,?,?,?,?)", [
        (1, "faculty", 2, "academic", "medium", "Attendance 86% - below class target 90%.", "attendance_drop", dt(-3)),
        (1, "admin", 50, "academic", "info", "ML quiz score 68 - watch cohort topic 4.", "quiz Dip", dt(-1)),
    ])
if maybe("student_goals"):
    ins("INSERT INTO student_goals (student_id, target_cgpa, attendance_goal, study_hours_goal, updated_at) VALUES (?,?,?,?,?)", [
        (1, 8.5, 90.0, 4.0, dt(-2)), (2, 8.0, 88.0, 3.5, dt(-2)),
    ])
if maybe("study_time_logs"):
    ins("INSERT INTO study_time_logs (student_id, study_minutes, logged_at) VALUES (?,?,?)", [
        (1, 210, dt(-1)), (1, 165, dt(-2)), (1, 90, dt(-3)), (1, 240, dt(-4)),
        (1, 120, dt(-5)), (1, 180, dt(-6)), (1, 200, dt(-7)),
        (2, 60, dt(-1)), (2, 45, dt(-2)),
    ])
if maybe("wellness_logs"):
    ins("INSERT INTO wellness_logs (student_id, log_date, sleep_hours, stress_level, focus_score) VALUES (?,?,?,?,?)", [
        (1, d(-1), 7.0, 3, 8), (1, d(-2), 6.5, 4, 7), (1, d(-3), 7.5, 2, 9),
        (1, d(-4), 6.0, 5, 6), (1, d(-5), 7.0, 3, 8), (1, d(-6), 8.0, 2, 9), (1, d(-7), 7.0, 3, 8),
    ])
if maybe("topic_analytics"):
    ins("INSERT INTO topic_analytics (subject_id, topic_name, fail_rate, avg_score, updated_at) VALUES (?,?,?,?,?)", [
        (2, "Normalisation to 3NF", 22.5, 61.0, dt(-1)),
        (3, "Deadlock Avoidance", 30.0, 55.0, dt(-1)),
        (4, "Subnetting", 18.0, 72.0, dt(-2)),
        (5, "Bias-Variance Tradeoff", 35.0, 49.0, dt(-2)),
        (1, "Recursion", 12.0, 74.0, dt(-3)),
    ])
if maybe("topic_progress"):
    ins("INSERT INTO topic_progress (student_id, subject_id, topic_name, progress_pct, last_reviewed) VALUES (?,?,?,?,?)", [
        (1, 1, "Comprehensions", 80, d(-1)), (1, 1, "Recursion", 65, d(-2)),
        (1, 2, "Normalisation", 55, d(-1)), (1, 2, "Joins", 70, d(-3)),
        (1, 3, "Virtual Memory", 40, d(-2)), (1, 4, "Subnetting", 60, d(-4)),
        (1, 5, "Gradient Descent", 30, d(-1)), (1, 5, "KNN", 45, d(-2)),
    ])
if maybe("engagement_analytics"):
    ins("INSERT INTO engagement_analytics (class_id, faculty_id, date, quiz_participation, attendance_interaction, notes) VALUES (?,?,?,?,?,?)", [
        (1, 2, d(-1), 78, 90, "Good quiz turnout."), (1, 3, d(-1), 64, 85, "Lower OS participation."),
        (1, 2, d(-2), 71, 88, ""), (1, 4, d(-2), 55, 80, "ML attendance dip."),
        (1, 2, d(-3), 82, 92, "Topping the trend."),
    ])
if maybe("workflow_rules"):
    ins("INSERT INTO workflow_rules (name, trigger_type, threshold, action_json, is_active, created_at) VALUES (?,?,?,?,?,?)", [
        ("Attendance alert", "low_attendance", 85, '{"notify":"faculty","message":"Attendance below threshold"}', 1, dt(-50)),
        ("Weak student escalate", "low_marks", 60, '{"notify":"hod","escalate":"mentor"}', 1, dt(-50)),
    ])
if maybe("workflow_logs"):
    ids = [r[0] for r in c.execute("SELECT id FROM workflow_rules").fetchall()]
    if ids:
        ins("INSERT INTO workflow_logs (rule_id, student_id, action_taken, created_at) VALUES (?,?,?,?)", [
            (ids[0], 1, "Notified faculty on 86% attendance", dt(-3)),
        ])
if maybe("escalation_logs"):
    ins("INSERT INTO escalation_logs (student_id, target_role, message, created_at) VALUES (?,?,?,?)", [
        (1, "admin", "ML scores flagged for mentoring follow-up.", dt(-2)),
    ])
if maybe("auto_evaluation_runs"):
    ins("INSERT INTO auto_evaluation_runs (uploaded_by, total_rows, weak_students, class_average, summary_json, created_at) VALUES (?,?,?,?,?,?)", [
        (50, 64, 9, 61.4, '{"weakest_topic":"Bias-Variance","best_topic":"Recursion"}', dt(-1)),
    ])
if maybe("academic_goals"):
    ins("INSERT INTO academic_goals (student_id, goal_text, target_date, status, created_at) VALUES (?,?,?,?,?)", [
        (1, "Score 90+ in DBMS midterm", d(23), "pending", dt(-5)),
        (1, "Complete DSA sorting lab early", d(5), "pending", dt(-4)),
    ])
if maybe("ai_study_plans"):
    ins("INSERT INTO ai_study_plans (student_id, exam_date, weak_subjects, available_hours, schedule_json, created_at) VALUES (?,?,?,?,?,?)", [
        (1, d(21), "Operating Systems,Machine Learning", 3, '{"Mon":"OS deadlock practice 1h","Tue":"ML gradient descent 1h","Wed":"OS past papers 1h","Thu":"KNN worksheet","Fri":"Revision all"}', dt(-2)),
    ])
if maybe("student_learning_progress"):
    ids = [r[0] for r in c.execute("SELECT id FROM learning_resources").fetchall()]
    if ids:
        ins("INSERT INTO student_learning_progress (student_id, resource_id, progress_pct, updated_at) VALUES (?,?,?,?)", [
            (1, ids[0], 100, dt(-9)), (1, ids[1], 60, dt(-8)), (1, ids[2], 25, dt(-6)),
        ])

# ------------------------------------------------------------------ campus life
if maybe("grievances"):
    ins("INSERT INTO grievances (student_id, title, description, category, priority, assigned_role, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)", [
        (1, "Wi-Fi drops in Hostel B evenings", "Connection dies every day 8-10 PM in block B.", "hostel", "normal", "warden", "in_progress", dt(-4), dt(-2)),
        (2, "Lab projector flickering", "Room 3 projector flickers; hard to read slides.", "academic", "normal", "hod", "open", dt(-1), dt(-1)),
    ])
if maybe("campus_complaints"):
    ins("INSERT INTO campus_complaints (student_id, category, subject, description, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)", [
        (1, "hostel", "Water cooler not working", "Second floor cooler empty since Monday.", "open", dt(-2), dt(-2)),
        (1, "academic", "Library card renewal", "Digital library history resets on login.", "in_progress", dt(-1), dt(-1)),
    ])
if maybe("maintenance_tickets"):
    ins("INSERT INTO maintenance_tickets (student_id, category, location, description, status, created_at) VALUES (?,?,?,?,?,?)", [
        (1, "Electricity", "Hostel B room 214", "Fan regulator sparking.", "in-progress", dt(-2)),
        (2, "Other", "Washroom block A", "Tap leak under sink.", "open", dt(-1)),
    ])
if maybe("counseling_appointments"):
    ins("INSERT INTO counseling_appointments (student_id, counselor_name, appointment_date, status, notes, created_at) VALUES (?,?,?,?,?,?)", [
        (1, "Ms. Latha (Wellness Cell)", d(3) + " 15:30", "scheduled", "Exam stress management.", dt(-3)),
        (2, "Ms. Latha (Wellness Cell)", d(5) + " 11:00", "scheduled", "Sleep routine.", dt(-2)),
    ])
if maybe("health_records"):
    ins("INSERT INTO health_records (student_id, blood_group, allergies, medical_history, emergency_contact_name, emergency_contact_phone, updated_at) VALUES (?,?,?,?,?,?,?)", [
        (1, "O+", "Dust", "None", "Parent", "9000000001", dt(-60)),
        (2, "B+", "Peanuts, Sulfa drugs", "Asthma (mild), carries inhaler", "Parent", "9000000002", dt(-60)),
    ])
if maybe("student_certificates"):
    ins("INSERT INTO student_certificates (student_id, title, issuer, category, issue_date, certificate_url, created_at) VALUES (?,?,?,?,?,?,?)", [
        (1, "Python for Everybody", "Coursera", "achievement", d(-90), "#", dt(-90)),
        (1, "Hackathon Finalist 2026", "College", "event", d(-45), "#", dt(-45)),
        (2, "First Aid Training", "Red Cross", "training", d(-30), "#", dt(-30)),
    ])
if maybe("student_documents"):
    ins("INSERT INTO student_documents (student_id, doc_type, status, details, qr_token, issued_on, created_at) VALUES (?,?,?,?,?,?,?)", [
        (1, "bonafide", "issued", "For scholarship application", "BON-2026-0001", d(-10), dt(-10)),
        (1, "id_card", "issued", "Midterm October 2026", "HT-2026-SEM3-001", d(-5), dt(-5)),
    ])
if maybe("revaluations"):
    ins("INSERT INTO revaluations (student_id, subject_name, exam_name, reason, status, created_at) VALUES (?,?,?,?,?,?)", [
        (1, "Machine Learning", "Midterm", "Answer 4 sections not summed correctly.", "pending", dt(-4)),
    ])

# ------------------------------------------------------------------ placements
if maybe("companies"):
    ins("INSERT INTO companies (name, website, industry, description, created_at) VALUES (?,?,?,?,?)", [
        ("Infodart Systems", "https://infodart.example.com", "IT Services", "Mass recruiter, 40L roles", dt(-60)),
        ("CloudNine Labs", "https://cloudnine.example.com", "Cloud", "Product startup, CICD focus", dt(-55)),
        ("Bharat Fintech", "https://bharatfintech.example.com", "Fintech", "Payments platform hiring CS+AI", dt(-50)),
        ("GreenGrid Energy", "https://greengrid.example.com", "Energy Tech", "IoT + ML for smart grids", dt(-45)),
        ("Meridian Analytics", "https://meridian.example.com", "Analytics", "Data science roles, strong intern-to-PPO", dt(-40)),
        ("NexaSoft", "https://nexasoft.example.com", "Software", "Tier-2 services, 6L package", dt(-35)),
    ])
if maybe("placement_applications"):
    jobs = {}  # there is no jobs table used by applications? there is job_id
    try:
        jobs = c.execute("SELECT id FROM jobs LIMIT 3").fetchall()
    except Exception:
        jobs = []
    job_ids = [j[0] for j in jobs] or [1, 2]
    ins("INSERT INTO placement_applications (job_id, student_id, status, resume_url, applied_at) VALUES (?,?,?,?,?)", [
        (job_ids[0], 1, "shortlisted", "#", dt(-6)),
        (job_ids[-1], 1, "applied", "#", dt(-2)),
    ])
if maybe("placement_interviews"):
    apps = [r[0] for r in c.execute("SELECT id FROM placement_applications").fetchall()]
    if apps:
        ins("INSERT INTO placement_interviews (application_id, scheduled_at, mode, meeting_link, interviewer_name, status, created_at) VALUES (?,?,?,?,?,?,?)", [
            (apps[0], d(2) + " 10:00:00", "online", "#", "Ms. Rao (CloudNine)", "scheduled", dt(-1)),
        ])
if maybe("mock_interviews"):
    ins("INSERT INTO mock_interviews (student_id, interviewer_name, scheduled_at, feedback, score, status, created_at) VALUES (?,?,?,?,?,?,?)", [
        (1, "TPO Cell", d(1) + " 14:00:00", "", None, "scheduled", dt(-3)),
        (1, "TPO Cell", d(-5) + " 14:00:00", "Good DS basics; slow on SQL query writing.", 7, "completed", dt(-6)),
    ])

# ------------------------------------------------------------------ hostel / transport / parking
if maybe("hostel_rooms"):
    ins("INSERT INTO hostel_rooms (block, room_number, capacity, occupied, fee_per_sem) VALUES (?,?,?,?,?)", [
        ("Boys-A", "101", 2, 2, 35000), ("Boys-A", "102", 2, 1, 35000), ("Boys-A", "201", 3, 1, 30000),
        ("Boys-B", "214", 2, 1, 32000), ("Girls-A", "105", 2, 1, 36000), ("Girls-A", "106", 2, 0, 36000),
        ("Girls-B", "301", 4, 2, 28000), ("Guest", "01", 1, 0, 20000),
    ])
if maybe("hostel_allocations"):
    rooms = {r[1]: r[0] for r in c.execute("SELECT id, room_number FROM hostel_rooms").fetchall()}
    ins("INSERT INTO hostel_allocations (student_id, room_id, status, allocated_at, vacated_at) VALUES (?,?,?,?,?)", [
        (1, rooms.get("214") or 4, "allocated", d(-90), None),
        (2, rooms.get("105") or 5, "allocated", d(-90), None),
    ])
if maybe("transport_routes"):
    ins("INSERT INTO transport_routes (route_name, bus_number, driver_name, driver_contact, fee_per_sem) VALUES (?,?,?,?,?)", [
        ("Route 1 - City Center", "KA-01-2201", "Ravi Kumar", "9880000001", 18000),
        ("Route 2 - North Ring", "KA-01-2202", "Suresh Naik", "9880000002", 18000),
        ("Route 3 - Lake Side", "KA-01-2203", "Manoj Bhat", "9880000003", 20000),
        ("Route 4 - Industrial Area", "KA-01-2204", "Kiran Shetty", "9880000004", 16000),
    ])
if maybe("transport_allocations"):
    rt = [r[0] for r in c.execute("SELECT id FROM transport_routes").fetchall()]
    if rt:
        ins("INSERT INTO transport_allocations (student_id, route_id, pickup_point, status, registered_at) VALUES (?,?,?,?,?)", [
            (1, rt[0], "Gate 1", "registered", d(-88)),
            (2, rt[2], "Lake Stop 4", "registered", d(-88)),
        ])
if maybe("parking_slots"):
    ins("INSERT INTO parking_slots (slot_number, zone, status) VALUES (?,?,?)", [
        ("P-A-01", "Zone A", "occupied"), ("P-A-02", "Zone A", "available"), ("P-A-03", "Zone A", "available"),
        ("P-B-01", "Zone B", "available"), ("P-B-02", "Zone B", "occupied"), ("P-B-03", "Zone B", "available"),
        ("P-C-01", "Zone C (2W)", "available"), ("P-C-02", "Zone C (2W)", "occupied"), ("P-C-03", "Zone C (2W)", "available"),
        ("P-V-01", "Visitor", "available"),
    ])
if maybe("vehicle_registrations"):
    slots = {r[1]: r[0] for r in c.execute("SELECT id, slot_number FROM parking_slots").fetchall()}
    c.execute("INSERT INTO vehicle_registrations (user_id, vehicle_number, vehicle_type, parking_slot_id, registered_at) VALUES (?,?,?,?,?)",
              (5, "KA-05-JQ-1102", "two_wheeler", slots.get("P-C-02") or 8, dt(-80)))
    c.execute("INSERT INTO vehicle_registrations (user_id, vehicle_number, vehicle_type, parking_slot_id, registered_at) VALUES (?,?,?,?,?)",
              (2, "KA-05-NM-4417", "four_wheeler", slots.get("P-A-01") or 1, dt(-80)))

# ------------------------------------------------------------------ cafetaria / store / wallet
if maybe("cafeteria_menu"):
    ins("INSERT INTO cafeteria_menu (item_name, category, price, is_available, image_url) VALUES (?,?,?,?,?)", [
        ("Veg Thali", "meals", 60, 1, "#"), ("Chicken Biryani", "meals", 110, 1, "#"),
        ("Paneer Dosa", "breakfast", 55, 1, "#"), ("Idli Plate (4)", "breakfast", 25, 1, "#"),
        ("Filter Coffee", "beverages", 15, 1, "#"), ("Cold Coffee", "beverages", 40, 1, "#"),
        ("Veg Sandwich", "snacks", 35, 1, "#"), ("Samosa", "snacks", 12, 0, "#"),
    ])
if maybe("store_items"):
    ins("INSERT INTO store_items (name, category, price, stock, image_url, description) VALUES (?,?,?,?,?,?)", [
        ("Campus Hoodie (M)", "Merchandise", 899, 20, "#", "Navy hoodie with crest"),
        ("Campus Hoodie (L)", "Merchandise", 899, 15, "#", "Navy hoodie with crest"),
        ("Notebook Pack (5)", "Stationery", 250, 50, "#", "Spiral notebooks"),
        ("Scientific Calculator", "Stationery", 650, 10, "#", "Casio fx-991ex classwork"),
        ("ID Card Lanyard", "Other", 99, 100, "#", "Blue strap lanyard"),
    ])
if maybe("cafeteria_orders"):
    ins("INSERT INTO cafeteria_orders (student_id, items_json, total_price, status, created_at) VALUES (?,?,?,?,?)", [
        (1, '[{"item":"Veg Thali","qty":1},{"item":"Filter Coffee","qty":1}]', 75, "completed", dt(-1, 13)),
    ])
if maybe("store_orders"):
    ins("INSERT INTO store_orders (student_id, items_json, total_amount, status, payment_method, created_at) VALUES (?,?,?,?,?,?)", [
        (1, '[{"item":"Notebook Pack (5)","qty":1}]', 250, "delivered", "wallet", dt(-6)),
    ])
if maybe("student_wallet"):
    ins("INSERT INTO student_wallet (student_id, balance, updated_at) VALUES (?,?,?)", [
        (1, 1125, dt(-1)), (2, 500, dt(-5)),
    ])
if maybe("wallet_transactions"):
    ins("INSERT INTO wallet_transactions (student_id, amount, type, description, created_at) VALUES (?,?,?,?,?)", [
        (1, 2000, "credit", "Parent top-up", dt(-10)),
        (1, -250, "debit", "Store: Notebook Pack", dt(-6)),
        (1, -75, "debit", "Cafeteria lunch", dt(-1, 13)),
        (2, 500, "credit", "Parent top-up", dt(-5)),
    ])

# ------------------------------------------------------------------ community / forum / groups
if maybe("forum_topics"):
    ins("INSERT INTO forum_topics (title, description, created_by, created_at) VALUES (?,?,?,?)", [
        ("Sem 3 Midterm prep group", "Share notes & tricky questions for midterms.", 5, dt(-6)),
        ("Best resources to learn Git?", "Looking for a hands-on tutorial.", 5, dt(-4)),
        ("Hostel mess menu suggestions", "Collecting feedback for the warden.", 2, dt(-2)),
    ])
if maybe("forum_posts"):
    tops = {r[1]: r[0] for r in c.execute("SELECT id, title FROM forum_topics").fetchall()}
    ins("INSERT INTO forum_posts (topic_id, user_id, content, created_at) VALUES (?,?,?,?)", [
        (tops.get("Sem 3 Midterm prep group") or 1, 5, "I made a 20-question OS practice sheet - will upload tonight.", dt(-6)),
        (tops.get("Sem 3 Midterm prep group") or 1, 2, "Great initiative. Add Banker's algorithm cases.", dt(-5)),
        (tops.get("Best resources to learn Git?") or 2, 5, "learngitbranching.js.org worked best for me.", dt(-4)),
        (tops.get("Hostel mess menu suggestions") or 3, 5, "More south-indian breakfast variety please.", dt(-2)),
        (tops.get("Hostel mess menu suggestions") or 3, 2, "Noted - will take to mess committee Friday.", dt(-1)),
    ])
if maybe("forum_replies"):
    ins("INSERT INTO forum_replies (topic_id, author_id, content, created_at) VALUES (?,?,?,?)", [
        (1, 5, "Practice sheet uploaded in drive link shared on campus feed.", dt(-5)),
        (2, 2, "Also try the Git chapters in the Digital Library.", dt(-4)),
        (3, 2, "Feedback compiled: 11 requests for variety.", dt(-1)),
    ])
if maybe("study_groups"):
    subs = [r[0] for r in c.execute("SELECT id FROM subjects_master LIMIT 3").fetchall()] or [1, 2, 3]
    ins("INSERT INTO study_groups (name, subject_id, created_by, created_at) VALUES (?,?,?,?)", [
        ("DSA Warriors", subs[0], 5, dt(-8)),
        ("DB Night Owls", subs[1], 2, dt(-6)),
        ("OS Crash Squad", subs[2], 2, dt(-5)),
    ])
if maybe("study_group_members"):
    grps = [r[0] for r in c.execute("SELECT id FROM study_groups").fetchall()]
    if grps:
        ins("INSERT INTO study_group_members (group_id, student_id, joined_at) VALUES (?,?,?)", [
            (grps[0], 1, dt(-8)), (grps[0], 2, dt(-7)), (grps[1], 1, dt(-6)), (grps[2], 1, dt(-5)),
        ])

# ------------------------------------------------------------------ mock tests
if maybe("mock_tests"):
    ins("INSERT INTO mock_tests (exam_type, title, total_marks, duration_mins, created_at) VALUES (?,?,?,?,?)", [
        ("GATE", "GATE CS Mock 1", 100, 180, dt(-20)),
        ("GATE", "GATE CS Mock 2", 100, 180, dt(-12)),
        ("CAT", "Aptitude Mock 1", 100, 120, dt(-8)),
    ])
if maybe("mock_test_submissions"):
    mts = [r[0] for r in c.execute("SELECT id FROM mock_tests").fetchall()]
    if mts:
        ins("INSERT INTO mock_test_submissions (test_id, student_id, score, rank_predicted, percentile, submitted_at) VALUES (?,?,?,?,?,?)", [
            (mts[0], 1, 54, 4210, 86.5, dt(-18)),
        ])

# ------------------------------------------------------------------ parent-facing tables
par = c.execute("SELECT id FROM parents LIMIT 1").fetchone()
par_id = par[0] if par else None
if par_id:
    if maybe("parent_notification_settings"):
        ins("INSERT INTO parent_notification_settings (parent_id, email_enabled, sms_enabled, app_enabled) VALUES (?,?,?,?)",
            [(par_id, 1, 1, 1)])
    if maybe("parent_daily_summaries"):
        ins("INSERT INTO parent_daily_summaries (parent_id, student_id, summary_date, attendance_today, study_minutes_today, open_alerts_count, predicted_marks, summary_text, created_at) VALUES (?,?,?,?,?,?,?,?,?)", [
            (par_id, 1, d(-1), "present", 210, 1, 78, "Attended all classes; 3.5h study; watch ML prep.", dt(-1)),
            (par_id, 1, d(-2), "present", 165, 0, 79, "Steady day; completed ER assignment.", dt(-2)),
            (par_id, 1, d(-3), "present", 90, 0, 79, "Light day; slept well.", dt(-3)),
        ])
    if maybe("parent_appointments"):
        ins("INSERT INTO parent_appointments (parent_id, faculty_id, student_id, purpose, preferred_date, status, remarks, created_at) VALUES (?,?,?,?,?,?,?,?)", [
            (par_id, 1, 1, "Discuss midterm readiness", d(2), "pending", "Prefer evening slot.", dt(-3)),
            (par_id, 2, 1, "Project Review 2 briefing", d(-4), "approved", "", dt(-8)),
        ])
    if maybe("meetings"):
        ins("INSERT INTO meetings (parent_id, faculty_user_id, student_id, requested_time, scheduled_time, status, parent_note, faculty_note, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", [
            (par_id, 2, 1, d(6) + " 16:00:00", d(6) + " 16:00:00", "approved", "Video call preferred.", "Will share project report beforehand.", dt(-3), dt(-2)),
            (par_id, 3, 1, d(8) + " 11:00:00", None, "requested", "Ward meeting availability.", "", dt(-2), dt(-2)),
        ])
else:
    print("NOTE: no parents row found - parent tables skipped")

if maybe("cases"):
    ins("INSERT INTO cases (student_id, category, status, severity, notes, actions, suggestions, resolution_summary, created_by, updated_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", [
        (1, "academic_decline", "in_progress", "medium", "ML quiz dip + attendance 86%.", "Weekly mentoring scheduled", "Revise gradient descent; maintain 4h daily study.", None, 50, 50, dt(-3), dt(-1)),
        (2, "attendance", "open", "low", "Attendance below section average.", "Warden notified", "Log leave reasons in app.", None, 50, 50, dt(-2), dt(-2)),
    ])
if maybe("decision_actions"):
    ins("INSERT INTO decision_actions (action_key, title, details, completed_by, completed_at) VALUES (?,?,?,?,?)", [
        ("alerts_resolve", "Resolve medium alert for Demo CSE Student", "Mentoring plan activated by HOD.", 50, dt(-2)),
        ("revaluation_approve", "Approve revaluation request - ML midterm", "Sent to exam cell.", 50, dt(-1)),
    ])
if maybe("assignment_versions"):
    subs = [r[0] for r in c.execute("SELECT id FROM assignment_submissions WHERE file_name IS NOT NULL LIMIT 2").fetchall()]
    if subs:
        ins("INSERT INTO assignment_versions (submission_id, file_path, version_number, submitted_at) VALUES (?,?,?,?)", [
            (subs[0], "sorting_report.zip", 1, dt(-4)),
            (subs[0], "sorting_report_v2.zip", 2, dt(-3)),
            (subs[1], "er_diagram.pdf", 1, dt(-1)),
        ])
if maybe("voice_notes"):
    ins("INSERT INTO voice_notes (faculty_id, subject_id, title, audio_url, created_at) VALUES (?,?,?,?,?)", [
        (1, 1, "Quick tip: list slicing in 60s", "#", dt(-5)),
        (2, 3, "Bankers algorithm recap", "#", dt(-3)),
        (3, 5, "Why L2 regularization works", "#", dt(-2)),
    ])
if maybe("curriculums"):
    ins("INSERT INTO curriculums (name, description) VALUES (?,?)", [
        ("B.Tech CSE 2026", "4-year computer science curriculum (8 semesters)."),
        ("B.Sc Artificial Intelligence 2026", "3-year AI/data-science curriculum (6 semesters)."),
    ])
if maybe("curriculum_semesters"):
    curs = [r[0] for r in c.execute("SELECT id FROM curriculums").fetchall()]
    if curs:
        ins("INSERT INTO curriculum_semesters (curriculum_id, number) VALUES (?,?)",
            [(curs[0], n) for n in range(1, 9)] + [(curs[1], n) for n in range(1, 7)])
if maybe("community_posts"):
    ins("INSERT INTO community_posts (user_id, user_role, display_name, body, created_at) VALUES (?,?,?,?,?)", [
        (5, "student", "Demo CSE Student", "Our hackathon team is forming - one slot open, ping me.", dt(-2)),
        (2, "faculty", "Dr. Ramesh Babu", "Reminder: project review 2 slides due before Friday.", dt(-1)),
        (50, "hod", "HOD - CSE", "Midterm schedule posted; wish you all the best.", dt(-1, 18)),
    ])
# ------------------------------------------------------------------ placement jobs (future deadlines)
_pj_cols_now = {r[1] for r in c.execute("PRAGMA table_info(placement_jobs)").fetchall()}
if 'job_type' not in _pj_cols_now:
    c.execute("ALTER TABLE placement_jobs ADD COLUMN job_type TEXT DEFAULT 'full-time'")
if maybe("placement_jobs") or c.execute("SELECT COUNT(*) FROM placement_jobs WHERE deadline >= ?", (d(0),)).fetchone()[0] == 0:
    ins("INSERT INTO placement_jobs (company_name, role, description, salary_package, location, deadline, requirements, created_at, min_cgpa, min_attendance, job_type) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [
        ("CloudNine Labs", "Cloud Engineer Trainee", "Build CI/CD pipelines and deploy microservices. Strong Linux + Python.", "12 LPA", "Bengaluru (Hybrid)", d(20), "CGPA>=7; Linux; Python; Git", dt(-5), 6.5, 75, "full-time"),
        ("Infodart Systems", "Associate Software Engineer", "Mass-hiring drive: aptitude + 2 tech rounds.", "6.5 LPA", "Mysuru (On-site)", d(15), "CGPA>=6; no active backlogs", dt(-7), 6.0, 70, "full-time"),
        ("Bharat Fintech", "Backend Developer Intern", "Payments ledger services in Java/Python. PPO on performance.", "25k/month stipend", "Remote", d(12), "CGPA>=7.5; SQL; Data structures", dt(-4), 7.0, 80, "internship"),
        ("GreenGrid Energy", "IoT + Analytics Engineer", "Sensor data pipelines and ML models for smart grids.", "10 LPA", "Hubli (On-site)", d(25), "CGPA>=6.5; Python; ML basics", dt(-3), 6.5, 75, "full-time"),
        ("NexaSoft", "QA Automation Intern", "Selenium + API testing automation suite.", "18k/month stipend", "Bengaluru", d(9), "CGPA>=6; attention to detail", dt(-2), 6.0, 65, "internship"),
    ])

# ------------------------------------------------------------------ gamification + demo classmates
if c.execute("SELECT COUNT(*) FROM student_gamification").fetchone()[0] < 3:
    c.execute("""INSERT INTO student_gamification (student_id, xp, level, badges_json, streak_days, last_activity_date)
                 VALUES (1, 340, 4, '["5-day streak","Quiz ace","Project milestone"]', 12, ?)
                 ON CONFLICT(student_id) DO UPDATE SET xp=340, level=4, badges_json='["5-day streak","Quiz ace","Project milestone"]', streak_days=12, last_activity_date=?""",
              (d(0), d(0)))
    if c.execute("SELECT COUNT(*) FROM student_gamification WHERE student_id=2").fetchone()[0] == 0:
        c.execute("""INSERT INTO student_gamification (student_id, xp, level, badges_json, streak_days, last_activity_date)
                     VALUES (2, 210, 3, '["First aid","Early bird"]', 5, ?)""", (d(-1),))
if c.execute("SELECT COUNT(*) FROM students").fetchone()[0] <= 2:
    names = [("Aarav Sharma", "KA24510012"), ("Diya Patel", "KA24510023"), ("Rohan Gowda", "KA24510034"),
             ("Ishita Rao", "KA24510045"), ("Vikram Reddy", "KA24510056"), ("Sneha Shetty", "KA24510067")]
    for name, mob in names:
        c.execute("""INSERT INTO students (name, attendance, study_hours, sleep_hours, created_at, department_id, semester_id, mobile)
                     VALUES (?, ?, ?, ?, ?, 1, 3, ?)""",
                  (name, round(80 + random.random() * 15, 1), round(2.5 + random.random() * 4, 1),
                   round(6.0 + random.random() * 2, 1), dt(-120, 9), mob))
    for row in c.execute("SELECT id FROM students WHERE id > 2").fetchall():
        xp = random.randint(80, 620)
        c.execute("INSERT INTO student_gamification (student_id, xp, level, badges_json, streak_days, last_activity_date) VALUES (?,?,?,?,?,?)",
                  (row[0], xp, max(1, xp // 100), "[]", random.randint(0, 20), d(-random.randint(0, 3))))

# ------------------------------------------------- realistic weekly timetable
# The base seeders leave a repetitive artificial pattern; replace semester-3
# rows with a believable spread of subjects across the week.
c.execute("DELETE FROM timetables WHERE dept_id = 1 AND semester = 3")
c.executemany(
    "INSERT INTO timetables (dept_id, semester, day_of_week, start_time, end_time, subject_id, room_number) VALUES (1, 3, ?, ?, ?, ?, ?)",
    [
        ('Monday', '09:00', '10:00', 1, 'LHC-100'),
        ('Monday', '10:00', '11:00', 2, 'LHC-101'),
        ('Monday', '14:00', '15:00', 3, 'LHC-102'),
        ('Tuesday', '09:00', '10:00', 5, 'LHC-103'),
        ('Tuesday', '10:00', '11:00', 1, 'LHC-100'),
        ('Tuesday', '11:00', '12:00', 4, 'LHC-104'),
        ('Wednesday', '09:00', '10:00', 2, 'LHC-101'),
        ('Wednesday', '10:00', '11:00', 3, 'LHC-102'),
        ('Wednesday', '15:00', '16:00', 5, 'LHC-103'),
        ('Thursday', '09:30', '10:30', 4, 'LHC-104'),
        ('Thursday', '10:30', '11:30', 2, 'LHC-101'),
        ('Thursday', '14:00', '15:00', 1, 'LHC-100'),
        ('Friday', '09:00', '10:00', 3, 'LHC-102'),
        ('Friday', '10:00', '11:00', 5, 'LHC-103'),
        ('Friday', '11:00', '12:00', 2, 'LHC-105'),
        ('Saturday', '10:00', '11:00', 4, 'LHC-104'),
    ],
)

# ------------------------------------------------------------------ wrap
total_rows = 0
for n, in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall():
    total_rows += c.execute("SELECT COUNT(*) FROM %s" % n).fetchone()[0]
empty = [n for (n,) in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
         if c.execute("SELECT COUNT(*) FROM %s" % n).fetchone()[0] == 0]
print("EMPTY TABLES REMAINING:", len(empty), empty)
print("TOTAL ROWS ACROSS DB:", total_rows)
conn.close()
