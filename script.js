document.addEventListener('DOMContentLoaded', () => {
    const csvFileInput = document.getElementById('csvFileInput');
    const fileNameDisplay = document.getElementById('fileName');
    const chartTypeSelect = document.getElementById('chartType');
    const xAxisSelect = document.getElementById('xAxisColumn');
    const yAxisSelect = document.getElementById('yAxisColumn');
    const yAxisMultiGroup = document.getElementById('yAxisColumnMultiGroup');
    const yAxisMultiCheckboxesContainer = document.getElementById('yAxisColumnMultiCheckboxes');
    const generateChartButton = document.getElementById('generateChartButton');
    const controlsArea = document.getElementById('controlsArea');
    const chartContainer = document.querySelector('.chart-container');
    const dataPreviewArea = document.getElementById('dataPreviewArea');
    const csvPreviewTable = document.getElementById('csvPreviewTable');
    const sampleDataButton = document.getElementById('sampleDataButton');

    let chartInstance = null;
    let parsedData = [];
    let headers = [];

    document.getElementById('currentYear').textContent = new Date().getFullYear();

    // Sample Data
    const sampleCSVData = `Month,Sales,Expenses,Profit
Jan,1500,800,700
Feb,1700,900,800
Mar,1600,850,750
Apr,1900,1000,900
May,2200,1100,1100
Jun,2000,1050,950
Jul,2500,1200,1300
Aug,2300,1150,1150
Sep,2100,1000,1100
Oct,2600,1300,1300
Nov,2800,1400,1400
Dec,3000,1500,1500`;

    sampleDataButton.addEventListener('click', () => {
        fileNameDisplay.textContent = "sample_data.csv";
        processCSVData(sampleCSVData);
    });


    csvFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                processCSVData(e.target.result);
            };
            reader.readAsText(file);
        } else {
            fileNameDisplay.textContent = "No file chosen";
            controlsArea.style.display = 'none';
            clearChartAndPreview();
        }
    });

    function processCSVData(csvString) {
        Papa.parse(csvString, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true, // Important for numbers to be treated as numbers
            complete: (results) => {
                parsedData = results.data;
                headers = results.meta.fields;

                if (parsedData.length === 0 || headers.length === 0) {
                    alert("Could not parse CSV data or CSV is empty.");
                    controlsArea.style.display = 'none';
                    clearChartAndPreview();
                    return;
                }

                populateSelectOptions(headers);
                displayDataPreview(parsedData, headers);
                controlsArea.style.display = 'block';
                dataPreviewArea.style.display = 'block';
                // Automatically generate chart with initial selections
                handleChartGeneration();
            }
        });
    }

    function populateSelectOptions(currentHeaders) {
        xAxisSelect.innerHTML = '';
        yAxisSelect.innerHTML = '';
        yAxisMultiCheckboxesContainer.innerHTML = '';

        currentHeaders.forEach(header => {
            const optionX = document.createElement('option');
            optionX.value = header;
            optionX.textContent = header;
            xAxisSelect.appendChild(optionX);

            const optionY = document.createElement('option');
            optionY.value = header;
            optionY.textContent = header;
            yAxisSelect.appendChild(optionY);

            // For multi-select Y-axis (e.g., scatter, radar)
            const checkboxLabel = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = header;
            checkbox.id = `ycol-${header.replace(/\s+/g, '-')}`; // Create a safe ID
            checkboxLabel.htmlFor = checkbox.id;
            checkboxLabel.appendChild(checkbox);
            checkboxLabel.appendChild(document.createTextNode(` ${header}`));
            yAxisMultiCheckboxesContainer.appendChild(checkboxLabel);

        });

        // Set default selections (e.g., first for X, second for Y)
        if (currentHeaders.length > 0) xAxisSelect.value = currentHeaders[0];
        if (currentHeaders.length > 1) yAxisSelect.value = currentHeaders[1];
    }
    function getLikelyColumnType(values) {
        let numericCount = 0;
        let dateCount = 0;
        let textCount = 0; // Includes boolean, null, undefined for simplicity here

        const sampleSize = Math.min(values.length, 20); // Sample up to 20 values

        for (let i = 0; i < sampleSize; i++) {
            const value = values[i];
            if (value === null || typeof value === 'undefined' || String(value).trim() === "") {
                // Skip empty or null for type detection, or count as text if prevalent
                textCount++; // Consider empty/null as contributing to 'text' if not clearly other types
                continue;
            }

            if (typeof value === 'number' && isFinite(value)) {
                numericCount++;
            } else if (value instanceof Date && !isNaN(value.getTime())) { // PapaParse dynamicTyping might convert to Date
                dateCount++;
            } else if (typeof value === 'string') {
                // Try to parse common date patterns for strings if not already a Date object
                // More robust date parsing might be needed for various formats
                if (/^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) {
                    if (!isNaN(new Date(value).getTime())) {
                        dateCount++;
                        continue;
                    }
                }
                textCount++;
            } else if (typeof value === 'boolean') {
                textCount++; // Count booleans as text/categorical for this summary
            } else {
                textCount++;
            }
        }

        // Determine dominant type based on counts
        if (dateCount > numericCount && dateCount > textCount && dateCount >= sampleSize / 2) return 'date';
        if (numericCount > dateCount && numericCount > textCount && numericCount >= sampleSize / 2) return 'numeric';
        return 'text'; // Default to text/categorical
    }

    function identifyColumnTypes(data, dataHeaders) {
        columnTypes = {};
        dataHeaders.forEach(header => {
            const columnValues = data.map(row => row[header]);
            columnTypes[header] = getLikelyColumnType(columnValues);
        });
    }

    function displayDatasetSummary(data, dataHeaders, identifiedTypes) {
        summaryList.innerHTML = ''; // Clear previous summary

        const totalRows = data.length;
        const totalCols = dataHeaders.length;
        let numericTypeCount = 0;
        let dateTypeCount = 0;
        let textTypeCount = 0;

        dataHeaders.forEach(header => {
            const type = identifiedTypes[header];
            if (type === 'numeric') numericTypeCount++;
            else if (type === 'date') dateTypeCount++;
            else textTypeCount++;
        });

        const summaryItems = [
            { icon: 'fas fa-list-ol', label: 'Total Rows', value: totalRows },
            { icon: 'fas fa-columns', label: 'Total Columns', value: totalCols },
            { icon: 'fas fa-hashtag', label: 'Numeric Columns', value: numericTypeCount },
            { icon: 'fas fa-calendar-alt', label: 'Date Columns', value: dateTypeCount },
            { icon: 'fas fa-font', label: 'Text/Boolean Columns', value: textTypeCount }
        ];

        summaryItems.forEach(item => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<i class="${item.icon}"></i><strong>${item.label}:</strong> ${item.value}`;
            summaryList.appendChild(listItem);
        });
    }



    function displayDataPreview(data, dataHeaders) {
        csvPreviewTable.innerHTML = ''; // Clear previous preview

        // Create header row
        const aThead = csvPreviewTable.createTHead();
        const headerRow = aThead.insertRow();
        dataHeaders.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });

        // Create data rows (max 10)
        const aTbody = csvPreviewTable.createTBody();
        const numRowsToPreview = Math.min(data.length, 10);
        for (let i = 0; i < numRowsToPreview; i++) {
            const row = aTbody.insertRow();
            dataHeaders.forEach(header => {
                const cell = row.insertCell();
                cell.textContent = data[i][header] !== null && data[i][header] !== undefined ? data[i][header] : '';
            });
        }
    }


    chartTypeSelect.addEventListener('change', handleChartGeneration);
    xAxisSelect.addEventListener('change', handleChartGeneration);
    yAxisSelect.addEventListener('change', handleChartGeneration);
    // Add event listeners for checkboxes if they are dynamically created
    yAxisMultiCheckboxesContainer.addEventListener('change', (event) => {
        if(event.target.type === 'checkbox') {
            handleChartGeneration();
        }
    });


    generateChartButton.addEventListener('click', handleChartGeneration);

    function handleChartGeneration() {
        if (parsedData.length === 0) {
            // alert("Please upload a CSV file first.");
            return;
        }

        const chartType = chartTypeSelect.value;
        const xColumn = xAxisSelect.value;
        
        // Toggle visibility of single vs multi Y-axis selection
        if (['scatter', 'radar'].includes(chartType)) {
            yAxisSelect.style.display = 'none';
            yAxisSelect.parentElement.querySelector('label').style.display = 'none';
            yAxisMultiGroup.style.display = 'flex';
        } else {
            yAxisSelect.style.display = 'block';
            yAxisSelect.parentElement.querySelector('label').style.display = 'flex';
            yAxisMultiGroup.style.display = 'none';
        }
        
        const yColumn = yAxisSelect.value;
        const selectedYColumns = Array.from(yAxisMultiCheckboxesContainer.querySelectorAll('input[type="checkbox"]:checked'))
                                   .map(cb => cb.value);

        if (!xColumn) {
            alert("Please select a column for the X-axis / Labels.");
            return;
        }
        
        let datasets = [];
        const labels = parsedData.map(row => row[xColumn]);

        if (['bar', 'line', 'pie', 'doughnut', 'polarArea'].includes(chartType)) {
            if (!yColumn) {
                alert("Please select a column for the Y-axis / Values.");
                return;
            }
            const yData = parsedData.map(row => row[yColumn]);
            datasets = [{
                label: `${yColumn} by ${xColumn}`,
                data: yData,
                backgroundColor: chartType === 'pie' || chartType === 'doughnut' || chartType === 'polarArea' ? generateColors(yData.length) : getRandomColor(),
                borderColor: chartType === 'line' ? getRandomColor() : (chartType === 'bar' ? generateBorderColors(yData.length) : '#fff'),
                borderWidth: chartType === 'bar' ? 1 : (chartType === 'line' ? 2 : 1),
                fill: chartType === 'line' ? false : true, // No fill for line charts by default
            }];
        } else if (chartType === 'scatter') {
            if (selectedYColumns.length < 2) {
                // Scatter plot usually plots one Y against another Y, or X against Y.
                // For simplicity, let's assume X is one numeric column, and Y is another.
                // Or if we mean xColumn as category and selectedYColumns[0] as X-value and selectedYColumns[1] as Y-value
                // This part needs more refined logic based on typical scatter plot expectations.
                // A common scatter plot: X-axis is one numeric column, Y-axis is another numeric column.
                // Our current 'labels' are categories. For a true scatter, both axes should usually be numeric.
                // Let's adapt: xColumn provides X values, selectedYColumns[0] provides Y values.
                if (selectedYColumns.length === 0) {
                     alert("Please select at least one Y-axis column for Scatter plot values.");
                     return;
                }
                const scatterXData = parsedData.map(row => row[xColumn]); // Assuming xColumn is numeric for scatter
                const scatterYData = parsedData.map(row => row[selectedYColumns[0]]);
                datasets = [{
                    label: `${selectedYColumns[0]} vs ${xColumn}`,
                    data: scatterXData.map((val, index) => ({ x: val, y: scatterYData[index] })),
                    backgroundColor: getRandomColor(),
                }];

            } else { // For multiple series on scatter, this is more complex.
                      // Typically, a scatter plot shows relationship between two variables.
                      // For now, let's take the first selected Y column for Y values and X for X values.
                alert("Scatter plot with multiple Y-axes selection needs specific handling. Using first selected Y for now if xColumn is numeric, or two selected Y-axes if xColumn is labels.");
                // Option 1: xColumn = numeric X values, selectedYColumns[0] = numeric Y values
                // Option 2: xColumn = labels, selectedYColumns[0] = numeric X values, selectedYColumns[1] = numeric Y values
                // Let's assume Option 1 for simplicity if selectedYColumns.length === 1
                 const scatterXData = parsedData.map(row => row[xColumn]); // Assuming xColumn is numeric for scatter
                 const scatterYData = parsedData.map(row => row[selectedYColumns[0]]);
                 datasets = [{
                    label: `${selectedYColumns[0]} vs ${xColumn}`,
                    data: scatterXData.map((val, index) => ({ x: val, y: scatterYData[index] })),
                    backgroundColor: getRandomColor(),
                }];
            }
        } else if (chartType === 'radar') {
            if (selectedYColumns.length === 0) {
                alert("Please select at least one Y-axis column for Radar chart datasets.");
                return;
            }
            selectedYColumns.forEach(col => {
                datasets.push({
                    label: col,
                    data: parsedData.map(row => row[col]),
                    backgroundColor: getRandomColor(0.4), // semi-transparent
                    borderColor: getRandomColor(),
                    borderWidth: 1,
                    fill: true,
                });
            });
        }


        if (chartInstance) {
            chartInstance.destroy();
        }

        const ctx = document.getElementById('myChart').getContext('2d');
        try {
            chartInstance = new Chart(ctx, {
                type: chartType,
                data: {
                    labels: labels, // X-axis labels
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: (chartType !== 'pie' && chartType !== 'doughnut' && chartType !== 'polarArea' && chartType !== 'radar') ? {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: (['bar', 'line'].includes(chartType)) ? yAxisSelect.value : (chartType === 'scatter' && selectedYColumns.length > 0 ? selectedYColumns[0] : 'Value')
                            }
                        },
                        x: {
                             title: {
                                display: true,
                                text: xColumn
                            }
                        }
                    } : {},
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)}: ${ (chartType === 'radar' || chartType === 'scatter' && selectedYColumns.length > 1) ? 'Multiple Datasets' : (yAxisSelect.value || (selectedYColumns.length > 0 ? selectedYColumns[0] : ''))} by ${xColumn}`
                        }
                    }
                }
            });
            chartContainer.style.minHeight = '400px'; // Or some other appropriate height
        } catch (error) {
            console.error("Error creating chart:", error);
            alert("Error creating chart. Check if the selected columns are appropriate for the chart type (e.g., numeric data for values). \nDetails: " + error.message);
            clearChartAndPreview();
        }
    }
    
    function clearChartAndPreview() {
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        csvPreviewTable.innerHTML = '';
        dataPreviewArea.style.display = 'none';
        chartContainer.style.minHeight = '300px';
    }

    // Utility for colors
    function getRandomColor(alpha = 1) {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function generateColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(getRandomColor(0.7));
        }
        return colors;
    }
    function generateBorderColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(getRandomColor(1));
        }
        return colors;
    }

    // Smooth scrolling for nav links
    document.querySelectorAll('nav a[href^="#"], .hero-buttons a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            // Don't prevent default for external links or if href is just "#"
            if (href.startsWith('#') && href.length > 1) {
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Hamburger menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const navLinksContainer = document.querySelector('.nav-links-container');
    menuToggle.addEventListener('click', () => {
        navLinksContainer.classList.toggle('active');
    });

    // Optional: Close menu when a link is clicked (on mobile)
    document.querySelectorAll('#navLinks a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                navLinksContainer.classList.remove('active');
            }
        });
    });
});