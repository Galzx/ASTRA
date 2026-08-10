class ChatMessage {

    constructor(sender, text) {
        this.sender = sender;
        this.text = text;
        this.timestamp = new Date();
    }

    getFormattedTime() {
        const hours = this.timestamp.getHours();
        const minutes = this.timestamp.getMinutes();
        const ampm = hours >= 12 ? "PM" : "AM";
        const h = hours % 12 || 12;
        const m = minutes.toString().padStart(2, "0");
        return `${h}:${m} ${ampm}`;
    }

}

export default ChatMessage;