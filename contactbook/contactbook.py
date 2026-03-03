def add_contact():
    name = input("Enter Name: ")
    phone = input("Enter Phone: ")
    
    with open("contacts.txt", "a") as file:
        file.write(name + "," + phone + "\n")
    
    print("Contact Added Successfully!")


def view_contacts():
    with open("contacts.txt", "r") as file:
        contacts = file.readlines()
        
        for contact in contacts:
            name, phone = contact.strip().split(",")
            print("Name:", name, "| Phone:", phone)


def search_contact():
    search_name = input("Enter name to search: ")
    
    with open("contacts.txt", "r") as file:
        contacts = file.readlines()
        
        for contact in contacts:
            name, phone = contact.strip().split(",")
            if name.lower() == search_name.lower():
                print("Found:", name, phone)
                return
    
    print("Contact not found!")


def main():
    while True:
        print("\n1. Add Contact")
        print("2. View Contacts")
        print("3. Search Contact")
        print("4. Exit")
        
        choice = input("Enter choice: ")
        
        if choice == "1":
            add_contact()
        elif choice == "2":
            view_contacts()
        elif choice == "3":
            search_contact()
        elif choice == "4":
            print("Goodbye!")
            break
        else:
            print("Invalid choice")


if __name__ == "__main__":
    main()