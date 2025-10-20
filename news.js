// Load and display news from unified JSON data file
async function loadNews() {
    try {
        const response = await fetch('latest_news/news_data.json');
        const newsItems = await response.json();

        // Sort by date (newest first)
        newsItems.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
        });

        // Display only the first 6 most recent items
        displayNews(newsItems.slice(0, 6));

    } catch (error) {
        console.error('Error loading news:', error);
        // Fallback to hardcoded news if JSON fails to load
        displayFallbackNews();
    }
}

function parseNewsDate(dateStr) {
    // Handle date ranges (use the first date)
    const datePart = dateStr.split('→')[0].trim();

    // Parse various date formats
    const date = new Date(datePart);
    return isNaN(date.getTime()) ? new Date(0) : date;
}

function displayNews(newsItems) {
    const newsGrid = document.querySelector('.news-grid');
    if (!newsGrid) return;

    newsGrid.innerHTML = '';

    newsItems.forEach(item => {
        const newsDiv = document.createElement('div');
        newsDiv.className = 'news-item';

        const dateDiv = document.createElement('div');
        dateDiv.className = 'news-date';
        dateDiv.textContent = formatNewsDate(item);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'news-content';

        // Create link to detail page using ID
        const link = document.createElement('a');
        link.href = `latest_news/detail/index.html?id=${item.id}`;
        link.textContent = item.title;
        link.className = 'news-link';

        contentDiv.appendChild(link);
        newsDiv.appendChild(dateDiv);
        newsDiv.appendChild(contentDiv);
        newsGrid.appendChild(newsDiv);
    });
}

function formatNewsDate(item) {
    const startDate = new Date(item.date);
    if (item.dateEnd) {
        const endDate = new Date(item.dateEnd);
        return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDate(dateStr) {
    // Return the date as-is if it contains a range
    if (dateStr.includes('→')) {
        return dateStr;
    }

    // Otherwise parse and format nicely
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function displayFallbackNews() {
    // This is the current hardcoded news (as fallback)
    const fallbackNews = [
        { date: "July 30, 2024", content: "GRIEVOUS now published in Bioinformatics!" },
        { date: "July 23, 2024", content: "RUNX1 now published in Cell Reports!" },
        { date: "November 16, 2023", content: "EUGENe now published in Nature Computation Science!" },
        { date: "November 3, 2023", content: "Clarence Mah successfully defends his thesis!" },
        { date: "December 1, 2022", content: "Kivilcim Ozturk successfully defends her thesis and graduates from the Carter Lab. Congratulations Dr. Ozturk!" },
        { date: "July 10-14, 2022", content: "Kivil and Meghana give talks at ISMB 2022, Madison, WI." }
    ];

    const newsGrid = document.querySelector('.news-grid');
    if (!newsGrid) return;

    newsGrid.innerHTML = '';

    fallbackNews.forEach(item => {
        const newsDiv = document.createElement('div');
        newsDiv.className = 'news-item';
        newsDiv.innerHTML = `
            <div class="news-date">${item.date}</div>
            <div class="news-content">${item.content}</div>
        `;
        newsGrid.appendChild(newsDiv);
    });
}

// Load news when page loads
document.addEventListener('DOMContentLoaded', loadNews);
