// Load and display people from individual profile files
async function loadPeople() {
    try {
        // Load index to get list of people IDs
        const indexResponse = await fetch('people/index.json?_=' + Date.now());
        const index = await indexResponse.json();

        // Load all profiles in parallel
        const timestamp = Date.now();
        const currentProfiles = await Promise.all(
            index.current.map(id => fetch(`people/profiles/${id}.json?_=${timestamp}`).then(r => r.json()))
        );

        const alumniProfiles = await Promise.all(
            index.alumni.map(id => fetch(`people/profiles/${id}.json?_=${timestamp}`).then(r => r.json()))
        );

        // Display PI (Hannah Carter)
        const pi = currentProfiles.find(p => p.id === 'hannah-carter');
        if (pi) {
            displayPI(pi);
        }

        // Display current members (excluding PI)
        const currentMembers = currentProfiles.filter(p => p.id !== 'hannah-carter');
        displayPeopleGrid('current-members-grid', currentMembers);

        // Display alumni
        displayPeopleGrid('alumni-grid', alumniProfiles);

    } catch (error) {
        console.error('Error loading people:', error);
    }
}

function displayPI(person) {
    const container = document.getElementById('pi-container');
    if (!container) return;

    container.innerHTML = `
        <div class="person-highlight" style="cursor: pointer;" onclick="window.location.href='people/detail/?id=${person.id}'">
            <img src="${getPhotoPath(person.photo)}" alt="${person.name}" class="person-image" />
            <h3>${person.name}</h3>
            <p class="person-title">${person.position}</p>
            ${person.affiliation ? `<p class="person-affiliation">${person.affiliation}</p>` : ''}
        </div>
    `;
}

function displayPeopleGrid(containerId, people) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    people.forEach(person => {
        const personCard = document.createElement('div');
        personCard.className = 'person-card';

        personCard.innerHTML = `
            <img src="${getPhotoPath(person.photo)}" alt="${person.name}" />
            <h4>${person.name}</h4>
            ${person.position ? `<p class="person-position">${person.position}</p>` : ''}
        `;

        // Make card clickable to go to detail page
        personCard.style.cursor = 'pointer';
        personCard.onclick = () => {
            window.location.href = `people/detail/?id=${person.id}`;
        };

        container.appendChild(personCard);
    });
}

function getPhotoPath(photoFilename) {
    if (!photoFilename) {
        // Return placeholder image
        return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%23e0e0e0" width="150" height="150"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23999"%3EPhoto%3C/text%3E%3C/svg%3E';
    }
    // Photos are in the assets folder
    return `assets/images/people/${photoFilename}`;
}

// Load people when page loads
document.addEventListener('DOMContentLoaded', loadPeople);
