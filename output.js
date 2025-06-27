const { ipcRenderer } = require('electron');
const fs = require('fs');
const csv = require('csv-parser');
const { fetchEmailsAsJSON } = require('./IMAP'); // Import module code

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Settings Button
    const settingsBtn = document.getElementById('setBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }
});
     

// Fetch Button
document.getElementById('checkBtn').addEventListener('click', async () => {
    const fetchbutton = document.getElementById('checkBtn');
    const analyzebutton = document.getElementById('analyzeBtn');
    const output = document.getElementById('output');
    const loading = document.getElementById('loading');
    const placeholder = document.getElementById('placeholder');


    // Show loading state
    fetchbutton.disabled = true;
    analyzebutton.disabled = true;
    fetchbutton.innerHTML = 'Getting Started...';
    analyzebutton.innerHTML = 'disabled';
    loading.classList.add('show');
    output.style.display = 'none';
    if (placeholder) placeholder.style.display = 'none';

    try {
        fetchbutton.innerHTML = 'Getting Emails...';
        //
        await ipcRenderer.invoke('fetch-emails');
        
    } catch (error) {
        output.textContent = `❌ Error: ${error.message}`;
        output.style.display = 'block';
    } finally {
        // Reset button state
        fetchbutton.disabled = false;
        analyzebutton.disabled = false;
        fetchbutton.innerHTML = 'Fetch Emails';
        analyzebutton.innerHTML = 'Analyze Emails';
        loading.classList.remove('show');
    }      
});


// Analyze Button
document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const fetchbutton = document.getElementById('checkBtn');
    const analyzebutton = document.getElementById('analyzeBtn');
    const output = document.getElementById('output');
    const loading = document.getElementById('loading');
    const placeholder = document.getElementById('placeholder');


    // Show loading state
    fetchbutton.disabled = true;
    analyzebutton.disabled = true;
    fetchbutton.innerHTML = 'disabled';
    analyzebutton.innerHTML = 'Getting Started...';
    loading.classList.add('show');
    output.style.display = 'none';
    if (placeholder) placeholder.style.display = 'none';

    try {
        analyzebutton.innerHTML = 'Connecting to Cohere...';
        const result = await ipcRenderer.invoke('check-emails');
        
        // Show results
        analyzebutton.innerHTML = 'Processing Response...';
        await sleep(1000);
        await formatAIResponse(result);
        
    } catch (error) {
        output.textContent = `❌ Error: ${error.message}`;
        output.style.display = 'block';
    } finally {
        // Reset button state
        fetchbutton.disabled = false;
        analyzebutton.disabled = false;
        fetchbutton.innerHTML = 'Fetch Emails';
        analyzebutton.innerHTML = 'Analyze Emails';
        loading.classList.remove('show');
    }      
});

async function formatAIResponse(text) {
    console.log('formatAIResponse called with:', text.substring(0, 100) + '...');
    
    // Update button for parsing phase
    const analyzebutton = document.getElementById('analyzeBtn');
    analyzebutton.innerHTML = 'Parsing Response...';
    await sleep(50);

    const lines = text.split('\n');

    let updates = 0;
    let confirmations = 0;
    let other = 0;

    let line = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('Futher:')) {
            line = i;
            break; // Exit the loop early if "Futher" is found
        }

        if (line.includes('Updates:')) {
            updates = parseInt(line.split(":")[1].trim());
        } else if (line.includes('Confirmations:')) {
            confirmations = parseInt(line.split(':')[1].trim());
        } else if (line.includes('Other')) {
            other = parseInt(line.split(':')[1].trim());
        }
    }

    // Update button for updating counts
    analyzebutton.innerHTML = 'Crunching Numbers...';
    await sleep(50);

    const updatesc = document.getElementById('updatecount');
    const confc= document.getElementById('confircount');
    const otherc= document.getElementById('othercount');

    if (updatesc) updatesc.textContent = updates;
    if (confc) confc.textContent = confirmations;
    if (otherc) otherc.textContent = other;    // Update button for extracting titles
    analyzebutton.innerHTML = 'Extracting CSV Titles...';
    await sleep(50);
    
    const emailsWithCategories = extractTitlesAndCategories(text);
    console.log('Extracted emails with categories:', emailsWithCategories);
    
    // Update button for matching emails
    analyzebutton.innerHTML = 'Loading Email Details...';
    await sleep(50);
    
    const output = await loadCSVandMatchWithCategories(emailsWithCategories);

    
    return output;
}


function extractTitles(text) {
    const lines = text.split('\n');
    let startIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('**Further:**')) {
            startIndex = i;
            break;
        }
    }

    if (startIndex === -1) {
        console.log('No "**Further:**" section found');
        return [];
    }

    let combined = '';
    for (let j = startIndex + 1; j < lines.length; j++) {
        combined += lines[j] + ' ';
    }

    const rawTitles = combined.split(',');
    const cleanTitles = rawTitles.map(title => title.replace(/"/g, '').trim()).filter(t => t !== '');

    return cleanTitles;
}

function extractTitlesAndCategories(text) {
    const lines = text.split('\n');
    let furtherIndex = -1;
    let helperIndex = -1;

    // Find the sections
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('**Further:**') || lines[i].includes('**Futher:**')) {
            furtherIndex = i;
        }
        if (lines[i].includes('**Helper:**')) {
            helperIndex = i;
        }
    }

    if (furtherIndex === -1 || helperIndex === -1) {
        console.log('Missing sections - Further:', furtherIndex, 'Helper:', helperIndex);
        return [];
    }

    // Extract titles from Further section
    let titlesText = '';
    for (let j = furtherIndex + 1; j < helperIndex; j++) {
        titlesText += lines[j] + ' ';
    }

    // Extract categories from Helper section
    let categoriesText = '';
    for (let j = helperIndex + 1; j < lines.length; j++) {
        categoriesText += lines[j] + ' ';
    }

    const rawTitles = titlesText.split(',');
    const cleanTitles = rawTitles.map(title => title.replace(/"/g, '').trim()).filter(t => t !== '');

    const rawCategories = categoriesText.split(',');
    const cleanCategories = rawCategories.map(cat => cat.replace(/"/g, '').trim()).filter(c => c !== '');

    // Combine titles with their categories
    const emailsWithCategories = [];
    for (let i = 0; i < Math.min(cleanTitles.length, cleanCategories.length); i++) {
        emailsWithCategories.push({
            title: cleanTitles[i],
            category: cleanCategories[i]
        });
    }

    console.log('Extracted titles with categories:', emailsWithCategories);
    return emailsWithCategories;
}

function readCSV() {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream('emails.csv')
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

async function loadCSVandMatchWithCategories(emailsWithCategories) {
    // Update button for CSV reading
    const analyzebutton = document.getElementById('analyzeBtn');
    analyzebutton.innerHTML = 'Reading Email Database...';
    await sleep(50);

    let results;
    try{
        results = await readCSV();
    } catch {
        console.log('Error');
    }
    
    console.log('Parsed CSV Results:', results); // Log parsed CSV data

    // Update button for matching process
    analyzebutton.innerHTML = 'Matching Emails...';

    // Create a map for faster lookup
    const titleToCategoryMap = {};
    emailsWithCategories.forEach(item => {
        titleToCategoryMap[item.title] = item.category;
    });

    const matched = results.filter(row => {
        return emailsWithCategories.some(email => email.title === row.Subject);
    }).map(row => {
        // Add category to the row
        return {
            ...row,
            category: titleToCategoryMap[row.Subject] || 'other'
        };
    });

    console.log('Matched Rows with Categories:', matched); // Log matched rows

    // Update button for display process
    analyzebutton.innerHTML = 'Displaying Results...';
    await sleep(50);

    const output = document.getElementById('output');
    output.style.display = 'block';
    output.innerHTML = '';

    // Helper function to get category styling
    function getCategoryStyle(category) {
        switch(category.toLowerCase()) {
            case 'updates':
                return { color: '#1976d2', icon: '�' };
            case 'confirmation':
                return { color: '#ef6c00', icon: '📧' };
            default:
                return { color: '#7b1fa2', icon: '📂' };
        }
    }

    matched.forEach(row => {
        let csvdate = row.Date;
        const extract1 = csvdate.split('T');
        const extract2 = extract1[1].split('.');
        
        const categoryStyle = getCategoryStyle(row.category);

        let injection = `
        <div class="email-entry" data-category="${row.category.toLowerCase()}">
            <h3 style="width:100%; display: flex; align-items: center; gap: 0.5rem;">
                ${row.Subject}
               
            </h3>
            <div class="email-details">
                <div class="email-item">
                    <div class="email-label">From: </div>
                    <p class="email-count" > ${row.From}</p>
                </div>
                <div class="email-item">
                    <div class="email-label">Date: </div>
                    <p class="email-count" > ${extract1[0]}</p>
                </div>
                <div class="email-item">
                    <div class="email-label">Time: </div>
                    <p class="email-count" > ${extract2[0]}</p>
                </div>
                <div class="email-cat" style="background: ${categoryStyle.color}; color: white;">
                     <span class="category-badge" >
                    ${row.category}
                </span>
                </div>
            </div>
        </div>
        `;
        output.insertAdjacentHTML('beforeend', injection);
    });

    return matched;
}

async function loadCSVandMatch(titles) {
    // Update button for CSV reading
    const analyzebutton = document.getElementById('analyzeBtn');
    analyzebutton.innerHTML = 'Reading Email Database...';
    await sleep(50);

    let results;
    try{
        results = await readCSV();
    } catch {
        console.log('Error');
    }
    
    console.log('Parsed CSV Results:', results); // Log parsed CSV data

    // Update button for matching process
    analyzebutton.innerHTML = 'Matching Emails...';

    const matched = results.filter(row =>
        titles.includes(row.Subject)
    );
    console.log('Matched Rows:', matched); // Log matched rows

    // Update button for display process
    analyzebutton.innerHTML = 'Displaying Results...';
    await sleep(50);

    const output = document.getElementById('output');
    output.style.display = 'block';
    output.innerHTML = '';

    // matched.forEach(row => {
    //     const emailDiv = document.createElement('div');
    //     emailDiv.className = 'email-entry';

    //     const title = document.createElement('h3');
    //     title.textContent = row.Subject;

    //     const from = document.createElement('p');
    //     from.innerHTML = `<strong>From:</strong> ${row.From}`;

    //     const date = document.createElement('p');
    //     const time = document.createElement('p');

    //     let csvdate = row.Date;
    //     const extract1 = csvdate.split('T');
    //     const extract2 = extract1[1].split('.');

    //     date.innerHTML = `<strong>Date:</strong> ${extract1[0]}`;
    //     time.innerHTML = `<strong>Time:</strong> ${extract2[0]}`;

    //     emailDiv.appendChild(title);
    //     emailDiv.appendChild(from);
    //     emailDiv.appendChild(date);
    //     emailDiv.appendChild(time);

    //     output.appendChild(emailDiv);
    // });
     matched.forEach(row => {

        let csvdate = row.Date;
        const extract1 = csvdate.split('T');
        const extract2 = extract1[1].split('.');

        let injection = `
        <div class="email-entry">
            <h3 style="width:100%">${row.Subject}</h3>
            <div class="email-details">
                <div class="email-item">
                    <div class="email-label">From: </div>
                    <p class="email-count" > ${row.From}</p>
                </div>
                <div class="email-item">
                    <div class="email-label">Date: </div>
                    <p class="email-count" > ${extract1[0]}</p>
                </div>
                <div class="email-item">
                    <div class="email-label">Time: </div>
                    <p class="email-count" > ${extract2[0]}</p>
                </div>
            </div>
        </div>
        `;
        output.insertAdjacentHTML('beforeend', injection);
    });

    return matched;
}