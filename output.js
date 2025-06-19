const { ipcRenderer } = require('electron');
const fs = require('fs');
const csv = require('csv-parser');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
      
document.getElementById('checkBtn').addEventListener('click', async () => {
const button = document.getElementById('checkBtn');
const output = document.getElementById('output');
const loading = document.getElementById('loading');
const placeholder = document.getElementById('placeholder');


// Show loading state
button.disabled = true;
button.innerHTML = 'Getting Started...';
loading.classList.add('show');
output.style.display = 'none';
if (placeholder) placeholder.style.display = 'none';

try {
    button.innerHTML = 'Getting Emails...';
    const result = await ipcRenderer.invoke('check-emails');
    
    // Show results
    button.innerHTML = 'Processing Response...';
    await sleep(1000);
    await formatAIResponse(result);
    
} catch (error) {
    output.textContent = `❌ Error: ${error.message}`;
    output.style.display = 'block';
} finally {
    // Reset button state
    button.disabled = false;
    button.innerHTML = 'Analyze Emails';
    loading.classList.remove('show');
}      });

async function formatAIResponse(text) {
    console.log('formatAIResponse called with:', text.substring(0, 100) + '...');
    
    // Update button for parsing phase
    const button = document.getElementById('checkBtn');
    button.innerHTML = 'Parsing Response...';
    await sleep(500);

    const lines = text.split('\n');

    let rejections = 0;
    let confirmations = 0;
    let interviews = 0;
    let offers = 0;
    let other = 0;

    let line = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('Futher:')) {
            line = i;
            break; // Exit the loop early if "Futher" is found
        }

        if (line.includes('Rejections:')) {
            rejections = parseInt(line.split(":")[1].trim());
        } else if (line.includes('Confirmations:')) {
            confirmations = parseInt(line.split(':')[1].trim());
        } else if (line.includes('Interviews:')) {
            interviews = parseInt(line.split(':')[1].trim());
        } else if (line.includes('Offers:')) {
            offers = parseInt(line.split(':')[1].trim());
        } else if (line.includes('Other')) {
            other = parseInt(line.split(':')[1].trim());
        }
    }

    // Update button for updating counts
    button.innerHTML = 'Crunching Numbers...';
    await sleep(500);

    const rejc= document.getElementById('rejecount');
    const interc= document.getElementById('intercount');
    const offc= document.getElementById('offercount');
    const confc= document.getElementById('confircount');
    const otherc= document.getElementById('othercount');

    if (rejc) rejc.textContent = rejections;
    if (interc) interc.textContent = interviews;
    if (offc) offc.textContent = offers;
    if (confc) confc.textContent = confirmations;
    if (otherc) otherc.textContent = other;

    // Update button for extracting titles
    button.innerHTML = 'Extracting CSV Titles...';
    await sleep(500);
    
    const titles = extractTitles(text);
    console.log('Extracted titles:', titles);
    
    // Update button for matching emails
    button.innerHTML = 'Loading Email Details...';
    await sleep(500);
    
    const output = await loadCSVandMatch(titles);

    
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

async function loadCSVandMatch(titles) {
    // Update button for CSV reading
    const button = document.getElementById('checkBtn');
    button.innerHTML = 'Reading Email Database...';
    await sleep(500);

    let results;
    try{
        results = await readCSV();
    } catch {
        console.log('Error');
    }
    
    console.log('Parsed CSV Results:', results); // Log parsed CSV data

    // Update button for matching process
    button.innerHTML = 'Matching Emails...';

    const matched = results.filter(row =>
        titles.includes(row.Subject)
    );
    console.log('Matched Rows:', matched); // Log matched rows

    // Update button for display process
    button.innerHTML = 'Displaying Results...';
    await sleep(500);

    const output = document.getElementById('output');
    output.style.display = 'block';
    output.innerHTML = '';

    matched.forEach(row => {
        const emailDiv = document.createElement('div');
        emailDiv.className = 'email-entry';

        const title = document.createElement('h3');
        title.textContent = row.Subject;

        const from = document.createElement('p');
        from.innerHTML = `<strong>From:</strong> ${row.From}`;

        const date = document.createElement('p');
        date.innerHTML = `<strong>Date:</strong> ${row.Date}`;

        const status = document.createElement('p');
        status.innerHTML = `<strong>Status:</strong> ${row.Status || 'N/A'}`;

        emailDiv.appendChild(title);
        emailDiv.appendChild(from);
        emailDiv.appendChild(date);
        emailDiv.appendChild(status);

        output.appendChild(emailDiv);
    });

    return matched;
}