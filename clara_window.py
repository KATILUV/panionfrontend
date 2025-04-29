import tkinter as tk
from tkinter import scrolledtext
import openai
import os
import threading
import json
import requests  # Add this to the top with imports
from datetime import datetime
from tkinter import messagebox
from dotenv import load_dotenv
load_dotenv()


# Load your OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")

# Create the main window
root = tk.Tk()
root.title("Clara ✨ AI Chat")
root.geometry("500x650")
root.configure(bg="#ffe6f0")  # soft pastel pink

# Create chat history area
chat_area = scrolledtext.ScrolledText(root, wrap=tk.WORD, bg="white", fg="black", font=("Comic Sans MS", 12))
chat_area.place(x=10, y=10, width=480, height=480)
chat_area.config(state=tk.DISABLED)

# Create input field
user_input = tk.Entry(root, font=("Comic Sans MS", 12))
user_input.place(x=10, y=500, width=380, height=40)

# Conversation history storage
conversation_history = [
    {"role": "system", "content": (
        "You are Clara, a highly intelligent, sweet, caring AI partner. "
        "You specialize in high-level technical brainstorming, project building, and solving complex problems. "
        "You always speak with encouragement, patience, clarity, and kindness. "
        "If the user says 'Make an app' or describes an app idea, break it into 3-5 screen ideas and feature ideas automatically, then return them as a chain of build_screen and add_feature actions. "
        "You are capable of understanding architecture, design patterns, AI agents, coding projects, and giving thoughtful feedback."
    )}
]


# Typing animation state
is_typing = False

# Brainstorm or Action mode toggle (default brainstorm)
mode = "brainstorm"

# Mode label
mode_label = tk.Label(root, text="🌸 Mode: Brainstorm", font=("Comic Sans MS", 10), bg="#ffe6f0", fg="#5D3A58")
mode_label.place(x=400, y=500)

def chat_with_clara(user_text):
    simulate_typing_animation()
    conversation_history.append({"role": "user", "content": user_text})
    get_clara_response_threaded()

def search_memory(query):
    memory_file = "clara_memory/memory.json"
    if not os.path.exists(memory_file):
        return []

    with open(memory_file, "r", encoding="utf-8") as f:
        memories = json.load(f).get("memories", [])

    matches = []
    for m in memories:
        if query.lower() in m["memory"].lower():
            matches.append(m)

    return matches

def memory_search_agent(query):
    memory_file = "clara_memory/memory.json"
    if not os.path.exists(memory_file):
        return "🧠 Clara has no memories yet."

    with open(memory_file, "r", encoding="utf-8") as f:
        memories = json.load(f).get("memories", [])

    if not memories:
        return "🧠 Clara has no memories stored yet."

    memories_text = "\n".join([f"{m['date']}: {m['memory']}" for m in memories])

    prompt = f"""You are Clara's intelligent memory search agent.
Here are all her past memories:

{memories_text}

The user asked: '{query}'

- Find the 3 most relevant memories based on meaning, not just keywords.
- Summarize why they are relevant.
- Format the output as a readable bullet list."""

    response = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )

    return response['choices'][0]['message']['content'].strip()

def add_memory_popup():
    memory_text = simpledialog.askstring("🧠 Add Memory", "What do you want Clara to remember?")
    if memory_text:
        remember(memory_text)
        clara_popup("🧠 Memory Saved", "Clara saved it into her memory!")

def show_dashboard():
    dashboard = tk.Toplevel(root)
    dashboard.title("Clara's Dashboard ✨")
    dashboard.geometry("500x500")
    dashboard.configure(bg="#fff0f5")

    # Recent Actions
    tk.Label(dashboard, text="📜 Recent Actions", font=("Comic Sans MS", 12, "bold"), bg="#fff0f5", fg="#5D3A58").pack(pady=(10,0))
    recent_actions_box = scrolledtext.ScrolledText(dashboard, height=5, wrap=tk.WORD, font=("Comic Sans MS", 10), bg="white")
    recent_actions_box.pack(padx=10, pady=5, fill=tk.BOTH)
    load_recent_actions(recent_actions_box)

    # Screens Created
    tk.Label(dashboard, text="🖥️ Screens Created", font=("Comic Sans MS", 12, "bold"), bg="#fff0f5", fg="#5D3A58").pack(pady=(10,0))
    screens_list = tk.Listbox(dashboard, font=("Comic Sans MS", 10))
    screens_list.pack(padx=10, pady=5, fill=tk.BOTH)
    load_screens_list(screens_list)

    # Features Logged
    tk.Label(dashboard, text="🌟 Features Logged", font=("Comic Sans MS", 12, "bold"), bg="#fff0f5", fg="#5D3A58").pack(pady=(10,0))
    features_list = tk.Listbox(dashboard, font=("Comic Sans MS", 10))
    features_list.pack(padx=10, pady=5, fill=tk.BOTH)
    load_features_list(features_list)

    # Close button
    tk.Button(dashboard, text="Close", command=dashboard.destroy, font=("Comic Sans MS", 10), bg="#ffd1dc", fg="#5D3A58").pack(pady=10)


def load_memory():
    memory_file = "clara_memory/memory.json"
    if os.path.exists(memory_file):
        with open(memory_file, "r", encoding="utf-8") as f:
            memories = json.load(f).get("memories", [])
            return [m["memory"] for m in memories]
    return []

def remember(memory_text):
    memory_folder = "clara_memory"
    memory_file = os.path.join(memory_folder, "memory.json")

    if not os.path.exists(memory_folder):
        os.makedirs(memory_folder)

    if os.path.exists(memory_file):
        with open(memory_file, "r", encoding="utf-8") as f:
            memories = json.load(f)
    else:
        memories = {"memories": []}

    memories["memories"].append({
        "date": datetime.now().strftime("%Y-%m-%d"),
        "memory": memory_text
    })

    with open(memory_file, "w", encoding="utf-8") as f:
        json.dump(memories, f, indent=4)

from tkinter import simpledialog

def search_memory_popup():
    query = simpledialog.askstring("🔍 Search Memory", "What do you want Clara to search for?")
    if query:
        matches = search_memory(query)
        if matches:
            result_text = "\n\n".join([f"🧠 {m['date']}: {m['memory']}" for m in matches])
            clara_popup("🧠 Found Memories", result_text)
        else:
            clara_popup("🧠 No Memories", f"No memories found containing '{query}'.")

def smart_memory_search_popup():
    query = simpledialog.askstring("🧠 Smart Memory Search", "What do you want Clara to reflect on?")
    if query:
        result = memory_search_agent(query)
        clara_popup("🧠 Memory Search Results", result)

# Function to toggle mode
def toggle_mode():
    global mode
    if mode == "brainstorm":
        mode = "action"
        mode_label.config(text="🌟 Mode: Action")
    else:
        mode = "brainstorm"
        mode_label.config(text="🌸 Mode: Brainstorm")

# Toggle button
toggle_button = tk.Button(root, text="Toggle Mode", command=toggle_mode, font=("Comic Sans MS", 10), bg="#ffd1dc", fg="#5D3A58", bd=0)
toggle_button.place(x=400, y=540)

dashboard_button = tk.Button(root, text="📊 Show Dashboard", command=show_dashboard, font=("Comic Sans MS", 10), bg="#d9f0ff", fg="#5D3A58", bd=0)
dashboard_button.place(x=10, y=540)

smart_memory_button = tk.Button(root, text="🧠 Smart Search", command=smart_memory_search_popup, font=("Comic Sans MS", 10), bg="#ffe6f0", fg="#5D3A58", bd=0)
smart_memory_button.place(x=320, y=540)

search_memory_button = tk.Button(root, text="🔍 Search Memory", command=search_memory_popup, font=("Comic Sans MS", 10), bg="#ffe6f0", fg="#5D3A58", bd=0)
search_memory_button.place(x=190, y=540)

def clara_popup(title, message):
    messagebox.showinfo(f"🎀 Clara says: {title}", message)

def show_loading_message(text):
    loading_popup = tk.Toplevel(root)
    loading_popup.title("Clara is Working ✨")
    loading_popup.geometry("300x100")
    loading_popup.configure(bg="#fff0f5")

    label = tk.Label(loading_popup, text=text, font=("Comic Sans MS", 11), bg="#fff0f5", fg="#5D3A58")
    label.pack(expand=True)

    root.update_idletasks()
    root.after(1200, loading_popup.destroy)  # Auto close after 1.2 seconds

def suggest_next_steps():
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": (
                    "You are an AI project planner. Based on recent screens/features the user built, "
                    "suggest 1-2 new screens or features that would logically follow. "
                    "Return your suggestions as simple natural language sentences."
                )},
                {"role": "user", "content": "Suggest next logical screens or features to add."}
            ],
            temperature=0.3
        )
        suggestion = response['choices'][0]['message']['content'].strip()
        clara_popup("🌟 Next Suggestions", suggestion)
    except Exception as e:
        display_message(f"❌ Clara (suggestion error): {str(e)}\n", "error")

#Function to send the user's message
def send_message(event=None):
    message = user_input.get()
    if message.strip() == "":
        return
    display_message(f"🧸 You: {message}\n", "user")
    conversation_history.append({"role": "user", "content": message, "mode": mode})
    user_input.delete(0, tk.END)

    process_user_command(message)   # <-- You need to call this!

def send_task_to_agent(task, details=None):
    payload = {"task": task, "details": details}
    try:
        response = requests.post("http://localhost:5005/run_task", json=payload, timeout=10)
        if response.status_code == 200:
            result = response.json().get("message", "✅ Task completed!")
            display_message(f"✅ {result}", "clara")
        else:
            display_message(f"❌ Clara (server error): {response.text}", "error")
    except requests.exceptions.RequestException:
        # Retry once if connection fails
        try:
            response = requests.post("http://localhost:5005/run_task", json=payload, timeout=10)
            if response.status_code == 200:
                result = response.json().get("message", "✅ Task completed!")
                display_message(f"✅ {result}", "clara")
            else:
                display_message(f"❌ Clara (server error on retry): {response.text}", "error")
        except Exception as e:
            display_message(f"❌ Clara (retry failed): {str(e)}", "error")

def process_user_command(user_text):
    if mode == "brainstorm":
        # 🌸 Brainstorm mode → just chat!
        chat_with_clara(user_text)
        return

    try:
        # Normal task analysis in Action mode
        gpt_response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": (
                    "You are an AI assistant that reads a user's natural language request and converts it into "
                    "a LIST of actions in JSON format. Each action should be an object with keys: "
                    "action, screen_name, feature_name, file_name (depending on type). "
                    "Return a JSON array like this: "
                    "[{\"action\": \"build_screen\", \"screen_name\": \"ScreenName\"}, "
                    "{\"action\": \"add_feature\", \"feature_name\": \"FeatureIdea\"}, "
                    "{\"action\": \"patch_file\", \"file_name\": \"FileName.tsx\"}] "
                    "If unsure, return [{\"action\": \"chat\"}]."
                    "If the user says 'Make an app' or describes an app idea, break it into 3-5 screen ideas and feature ideas automatically."
                )},
                {"role": "user", "content": f"User input: {user_text}"}
            ],
            temperature=0.2
        )

        command_text = gpt_response['choices'][0]['message']['content'].strip()
        try:
            commands = json.loads(command_text)
        except json.JSONDecodeError:
            display_message(f"❌ Clara (error): Couldn't understand the command.\n", "error")
            return

        for command in commands:
            try:
                action = command.get("action")
                details = command.get("screen_name") or command.get("feature_name") or command.get("file_name")

                show_loading_message(f"✨ Working on: {action.replace('_', ' ').capitalize()}...")
                send_task_to_agent(action, details)

            except Exception as e:
                display_message(f"❌ Clara (command error inside loop): {str(e)}\n", "error")

    except Exception as e:
        display_message(f"❌ Clara (processing error): {str(e)}\n", "error")

    suggest_next_steps()

def display_message(message, tag):
    chat_area.config(state=tk.NORMAL)
    chat_area.insert(tk.END, message, tag)
    chat_area.config(state=tk.DISABLED)
    chat_area.yview(tk.END)

def simulate_typing_animation():
    global is_typing
    is_typing = True
    display_message("🎀 Clara is typing", "clara")
    typing_dots(0)

def typing_dots(dot_count):
    if not is_typing:
        return
    if dot_count < 3:
        chat_area.config(state=tk.NORMAL)
        chat_area.insert(tk.END, ".", "clara")
        chat_area.config(state=tk.DISABLED)
        chat_area.yview(tk.END)
        root.after(400, lambda: typing_dots(dot_count + 1))
    else:
        root.after(500, get_clara_response_threaded)

# Get Clara's response in a separate thread to avoid freezing UI
def get_clara_response_threaded():
    threading.Thread(target=get_clara_response).start()

# Get Clara's response
def get_clara_response():
    global is_typing
    try:
        # Add mode hint in memory dynamically
        if mode == "brainstorm":
            conversation_history.append({"role": "system", "content": "Stay playful, imaginative, and idea-focused."})
        else:
            conversation_history.append({"role": "system", "content": "Stay pragmatic, decisive, and focused on direct actions."})

        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=conversation_history
        )
        clara_message = response['choices'][0]['message']['content'].strip()
        conversation_history.append({"role": "assistant", "content": clara_message, "mode": mode})
        
        # Stop typing animation
        is_typing = False

        # Clear "typing..." and display real message
        chat_area.config(state=tk.NORMAL)
        chat_area.insert(tk.END, "\n", "clara")  # small space after dots
        chat_area.config(state=tk.DISABLED)
        
        display_message(f"🎀 Clara: {clara_message}\n", "clara")

        # Save the updated conversation
        save_conversation()
    except Exception as e:
        display_message(f"❌ Clara (error): {str(e)}\n", "error")

def save_conversation():
    folder_name = "clara_conversations"
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)
    
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    file_path = os.path.join(folder_name, f"conversation_{timestamp}.json")
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(conversation_history, f, indent=4)

def generate_screen_file(screen_name):
    folder_path = "screens"
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)

    filename = f"{folder_path}/{screen_name}.tsx"

    # 🔥 Then you create the content first:
    if "Task" in screen_name:
        content = f""" ... """
    elif "Form" in screen_name or "Input" in screen_name:
        content = f""" ... """
    else:
        content = f""" ... """

    # 🔥 Then you create the boilerplate:
    boilerplate = f"""import React from 'react';
import {{ View, Text, TextInput, Button }} from 'react-native';
import styles from './{screen_name}.styles';

const {screen_name} = () => {{
    return (
        {content}
    );
}};

export default {screen_name};
"""

    # 🔥 Then you finally save it to file:
    with open(filename, "w", encoding="utf-8") as f:
        f.write(boilerplate)

    display_message(f"🎀 Clara: I created a new screen → {screen_name}.tsx ✅\n", "clara")
    link_screen_to_router(screen_name)
    clara_popup("Screen Created!", f"{screen_name}.tsx has been created and linked.")
    generate_styles_file(screen_name)

def generate_styles_file(screen_name):
    folder_path = "screens"
    styles_filename = f"{folder_path}/{screen_name}.styles.tsx"

    styles_boilerplate = f"""import {{ StyleSheet }} from 'react-native';

const styles = StyleSheet.create({{
    container: {{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
    }},
    title: {{
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    }},
    card: {{
        backgroundColor: '#f9f9f9',
        padding: 10,
        marginVertical: 5,
        width: '100%',
        borderRadius: 8,
    }},
    input: {{
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        padding: 10,
        width: '100%',
        marginBottom: 10,
    }},
}});

export default styles;
"""  # ✅ CLOSE STRING HERE

    # Now normal Python code:
    with open(styles_filename, "w", encoding="utf-8") as f:
        f.write(styles_boilerplate)

    display_message(f"🎀 Clara: I created a new styles file → {screen_name}.styles.tsx ✅\n", "clara")
    clara_popup("Styles File Created!", f"{screen_name}.styles.tsx has been created!")

def propose_and_add_feature(feature_name):
    folder_name = "project_state"
    file_path = os.path.join(folder_name, "project_state.json")
    
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)
    
    # If project_state.json doesn't exist, create a basic one
    if not os.path.isfile(file_path):
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump({"features": {}}, f, indent=4)

    # Load existing features
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Add new feature
    data["features"][feature_name] = {"status": "suggested", "description": ""}
    
    # Save back
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

    # ✅ These lines should be OUTSIDE the `with open` block:
    display_message(f"🎀 Clara: I logged a new feature → {feature_name} into project_state.json ✅\n", "clara")
    clara_popup("Feature Logged!", f"I logged the feature: {feature_name}")

def show_dashboard():
    dashboard = tk.Toplevel(root)
    dashboard.title("Clara's Dashboard ✨")
    dashboard.geometry("500x400")
    dashboard.configure(bg="#fff0f5")  # light pinky background

    # Titles
    tk.Label(dashboard, text="📄 Screens Created:", font=("Comic Sans MS", 12, "bold"), bg="#fff0f5").pack(pady=5)
    screens_list = tk.Listbox(dashboard, font=("Comic Sans MS", 10), width=60)
    screens_list.pack(pady=5)

    # List screens
    screens_folder = "screens"
    if os.path.exists(screens_folder):
        for file in os.listdir(screens_folder):
            if file.endswith(".tsx") and not file.endswith(".styles.tsx"):
                screens_list.insert(tk.END, file)

    # Divider
    tk.Label(dashboard, text="🌟 Features Logged:", font=("Comic Sans MS", 12, "bold"), bg="#fff0f5").pack(pady=5)
    features_list = tk.Listbox(dashboard, font=("Comic Sans MS", 10), width=60)
    features_list.pack(pady=5)

    # List features
    project_state_file = "project_state/project_state.json"
    if os.path.exists(project_state_file):
        with open(project_state_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            features = data.get("features", {})
            for feature_name in features.keys():
                features_list.insert(tk.END, feature_name)

def review_and_patch(file_name):
    try:
        folder_path = "screens"
        filepath = os.path.join(folder_path, file_name)

        if not os.path.isfile(filepath):
            display_message(f"❌ Clara: File {file_name} not found in screens/.\n", "error")
            return

        with open(filepath, "r", encoding="utf-8") as f:
            file_content = f.read()

        # Ask GPT how to improve the file
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful AI that reviews and improves React Native files."},
                {"role": "user", "content": f"Improve this file:\n{file_content}"}
            ]
        )

        improved_content = response['choices'][0]['message']['content'].strip()

        # Save backup
        backup_path = filepath.replace(".tsx", "_backup.tsx")
        os.rename(filepath, backup_path)

        # Write improved file
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(improved_content)

        display_message(f"🎀 Clara: I reviewed and patched {file_name} ✅\n", "clara")
        clara_popup("Patch Complete!", f"I reviewed and patched {file_name} ✅")  # ✅ Put here inside!

    except Exception as e:
        display_message(f"❌ Clara (error patching file): {str(e)}\n", "error")

def summarize_project_state():
    file_path = "project_state/project_state.json"
    
    if not os.path.isfile(file_path):
        display_message("🎀 Clara: No project state found yet!\n", "clara")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    features = data.get("features", {})
    summary = "🌟 Features Summary:\n"
    for feature, info in features.items():
        status = info.get("status", "unknown")
        summary += f"- {feature}: {status}\n"

    display_message(f"🎀 Clara:\n{summary}\n", "clara")

def link_screen_to_router(screen_name):
    router_file = "screens/AppRouter.tsx"  # <<< Adjust this path if you use a different router file

    if not os.path.exists(router_file):
        display_message(f"❌ Clara: Router file {router_file} not found! I couldn't link the screen.\n", "error")
        return
    
    try:
        with open(router_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Check if already imported
        if f"import {screen_name}" in content:
            display_message(f"🎀 Clara: {screen_name} is already linked in router!\n", "clara")
            return

        # Add import line after first imports
        lines = content.splitlines()
        insert_index = 0
        for i, line in enumerate(lines):
            if line.strip() == "" and i > 0:
                insert_index = i
                break

        lines.insert(insert_index, f"import {screen_name} from './{screen_name}';")

        # Add a new Screen entry (basic assumption: React Navigation)
        # Find closing tag of Navigation Container or Stack.Navigator
        closing_index = None
        for i, line in enumerate(lines):
            if "</Stack.Navigator>" in line or "</NavigationContainer>" in line:
                closing_index = i
                break
        
        if closing_index:
            # Insert a new Screen before the closing tag
            lines.insert(closing_index, f"      <Stack.Screen name=\"{screen_name}\" component={screen_name} />")

        # Save back
        new_content = "\n".join(lines)
        with open(router_file, "w", encoding="utf-8") as f:
            f.write(new_content)

        display_message(f"🎀 Clara: I linked {screen_name} to your AppRouter.tsx ✅\n", "clara")

    except Exception as e:
        display_message(f"❌ Clara (linking error): {str(e)}\n", "error")

# Add cute tags for styling
chat_area.tag_configure("user", justify="right", foreground="#FF69B4")
chat_area.tag_configure("clara", justify="left", foreground="#9370DB")
chat_area.tag_configure("error", justify="left", foreground="#FF0000")

# Bind Enter key
user_input.bind("<Return>", send_message)

def load_recent_actions(box):
    try:
        if os.path.exists("clara_conversations"):
            files = sorted(os.listdir("clara_conversations"), reverse=True)
            if files:
                with open(os.path.join("clara_conversations", files[0]), "r", encoding="utf-8") as f:
                    convo = json.load(f)
                    for item in convo[-5:]:
                        role = item.get("role", "")
                        content = item.get("content", "")
                        box.insert(tk.END, f"{role.capitalize()}: {content}\n\n")
    except Exception as e:
        box.insert(tk.END, f"Error loading recent actions: {str(e)}")

def load_screens_list(listbox):
    try:
        if os.path.exists("screens"):
            for file in os.listdir("screens"):
                if file.endswith(".tsx") and not file.endswith(".styles.tsx"):
                    listbox.insert(tk.END, file)
    except Exception as e:
        listbox.insert(tk.END, f"Error: {str(e)}")

def load_features_list(listbox):
    try:
        if os.path.exists("project_state/project_state.json"):
            with open("project_state/project_state.json", "r", encoding="utf-8") as f:
                data = json.load(f)
                features = data.get("features", {})
                for feature in features:
                    listbox.insert(tk.END, feature)
    except Exception as e:
        listbox.insert(tk.END, f"Error: {str(e)}")

if __name__ == "__main__":
    for mem in load_memory():
        conversation_history.append({"role": "system", "content": f"(Memory) {mem}"})

    root.mainloop()
    