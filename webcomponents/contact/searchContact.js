export class SearchContact extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.results = [];
    }

    connectedCallback() {
        this.render();
        // Close modal functionality
        this.shadowRoot.querySelector("#close-btn").addEventListener("click", () => {
            this.remove();
        });

        // Search functionality
        const searchInput = this.shadowRoot.querySelector("#search_input");
        const resultsDiv = this.shadowRoot.querySelector("#results");

        searchInput.addEventListener("input", () => {
            const query = searchInput.value.trim().toLowerCase();
            if (!query) {
                resultsDiv.textContent = "No search results";
                resultsDiv.classList.remove("hidden");
                return;
            }

            // Simulated search logic (replace with actual logic)
            const results = ["Account1", "Account2", "Account3"].filter(item => item.toLowerCase().includes(query));

            if (results.length > 0) {
                resultsDiv.innerHTML = results.map(item => `<div>${item}</div>`).join("");
                resultsDiv.classList.remove("hidden");
            } else {
                resultsDiv.textContent = "No search results";
                resultsDiv.classList.remove("hidden");
            }
        });
    }

    async handleSearch(event) {
        const query = event.target.value.trim();
        if (query.length < 3) {
            this.results = [];
            this.renderResults();
            return;
        }

        // Simulating API call
        this.results = await this.fetchAccounts(query);
        this.renderResults();
    }

    async fetchAccounts(query) {
        // Simulated API response
        return [
            { id: 1, name: "John Doe", status: "member" },
            { id: 2, name: "Jane Smith", status: "invite" },
            { id: 3, name: "Alice Johnson", status: "add" }
        ].filter(account => account.name.toLowerCase().includes(query.toLowerCase()));
    }

    renderResults() {
        const resultsContainer = this.shadowRoot.querySelector("#results");
        resultsContainer.innerHTML = "";
        this.results.forEach(account => {
            const contactCard = document.createElement("contact-card");
            contactCard.setAttribute("name", account.name);
            contactCard.setAttribute("status", account.status);
            resultsContainer.appendChild(contactCard);
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
                font-family: Arial, sans-serif;
            }
    
            .modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--surface-color, white);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                padding: 16px;
                border-radius: 8px;
                width: 320px;
                max-width: 90%;
            }
    
            #search-bar {
                display: flex;
                align-items: center;
                border-radius: 20px;
                height: 38px;
                border: 1px solid var(--palette-divider, #ccc);
                background: var(--surface-color, #f9f9f9);
                color: var(--on-surface-color, #333);
                padding-left: 10px;
                padding-right: 10px;

            }
    
            input {
                flex: 1;
                border: none;
                background: transparent;
                color: var(--on-surface-color, #000);
                font-size: 1rem;
                margin-left: 4px;
                margin-right: 4px;
            }
    
            input:focus {
                outline: none;
            }
    
            input::placeholder {
                color: var(--suface-color, #666);
            }
    
            iron-icon {
                cursor: pointer;
                
            }
    
            #results {
                margin-top: 16px;
                min-height: 200px;
                max-height: 500px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: var(--on-surface-color, #666);
                font-size: 1rem;
            }
    
            .hidden {
                display: none;
                color: var(--disabled-color, #666);
            }
    
        </style>
    
        <div class="modal">
            <div id="search-bar">
                <iron-icon id="search_icon" icon="search" style="--iron-icon-fill-color: var(--palette-text-accent);"></iron-icon>
                <input id="search_input" placeholder="Search" type="text">
                <iron-icon id="close-btn" icon="close"></iron-icon>
            </div>
            <div id="results" class="hidden">No search results</div>
        </div>
    `;

    }
}

customElements.define("globular-search-contact", SearchContact);