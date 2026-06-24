// State variables
let currentTerritory = 'sc'; // 'sc' or 'brasil'
let startYear = 2006;
let endYear = 2026;
let currentIndicator = 'producao';
let seasonalityYear = 2026;
let tableSortKey = 'year';
let tableSortOrder = 'asc';
let tableSearchQuery = '';

// Chart instances
let chartProducao = null;
let chartAreas = null;
let chartRendimento = null;
let chartSazonalidade = null;
let chartTendencia = null;

// Initialize app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initFilters();
  updateDashboard();
  setupEventListeners();
});

// Populate dropdowns based on available data
function initFilters() {
  const years = [...new Set(ibgeGrapesData.annual.map(item => item.year))].sort((a, b) => a - b);
  
  startYear = years[0];
  endYear = years[years.length - 1];
  seasonalityYear = endYear;

  const startSelect = document.getElementById('start-year-select');
  const endSelect = document.getElementById('end-year-select');
  const seasonalitySelect = document.getElementById('seasonality-year-select');

  startSelect.innerHTML = '';
  endSelect.innerHTML = '';
  seasonalitySelect.innerHTML = '';

  years.forEach(year => {
    // Start Year
    const optStart = document.createElement('option');
    optStart.value = year;
    optStart.textContent = year;
    if (year === startYear) optStart.selected = true;
    startSelect.appendChild(optStart);

    // End Year
    const optEnd = document.createElement('option');
    optEnd.value = year;
    optEnd.textContent = year;
    if (year === endYear) optEnd.selected = true;
    endSelect.appendChild(optEnd);

    // Seasonality Year
    const optSeason = document.createElement('option');
    optSeason.value = year;
    optSeason.textContent = year;
    if (year === seasonalityYear) optSeason.selected = true;
    seasonalitySelect.appendChild(optSeason);
  });
}

// Setup Event Listeners
function setupEventListeners() {
  // Territory Toggle
  const territoryButtons = document.querySelectorAll('#territory-toggle button');
  territoryButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      territoryButtons.forEach(b => b.classList.remove('active'));
      const targetBtn = e.currentTarget;
      targetBtn.classList.add('active');
      currentTerritory = targetBtn.getAttribute('data-value');
      updateDashboard();
    });
  });

  // Year Dropdowns
  document.getElementById('start-year-select').addEventListener('change', (e) => {
    startYear = parseInt(e.target.value);
    // Validation: Start Year cannot be greater than End Year
    if (startYear > endYear) {
      endYear = startYear;
      document.getElementById('end-year-select').value = endYear;
    }
    updateDashboard();
  });

  document.getElementById('end-year-select').addEventListener('change', (e) => {
    endYear = parseInt(e.target.value);
    // Validation: End Year cannot be less than Start Year
    if (endYear < startYear) {
      startYear = endYear;
      document.getElementById('start-year-select').value = startYear;
    }
    updateDashboard();
  });

  // Focus Indicator Dropdown
  document.getElementById('indicator-select').addEventListener('change', (e) => {
    currentIndicator = e.target.value;
    updateDashboard();
  });

  // Seasonality Year Dropdown
  document.getElementById('seasonality-year-select').addEventListener('change', (e) => {
    seasonalityYear = parseInt(e.target.value);
    renderSeasonalityChart();
  });

  // Search input for Table
  document.getElementById('table-search-input').addEventListener('input', (e) => {
    tableSearchQuery = e.target.value.toLowerCase();
    renderTable();
  });

  // Table header sorting
  const headers = document.querySelectorAll('#analytics-table th');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const key = header.getAttribute('data-sort');
      if (tableSortKey === key) {
        tableSortOrder = tableSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        tableSortKey = key;
        tableSortOrder = 'asc';
      }

      // Update header classes
      headers.forEach(h => {
        h.classList.remove('sort-asc', 'sort-desc');
      });
      header.classList.add(tableSortOrder === 'asc' ? 'sort-asc' : 'sort-desc');

      renderTable();
    });
  });
}

// Master update function
function updateDashboard() {
  const filteredData = getFilteredAnnualData();
  
  calculateKPIs(filteredData);
  renderProducaoChart(filteredData);
  renderAreasChart(filteredData);
  renderRendimentoChart(filteredData);
  renderSeasonalityChart();
  renderTendenciaChart(filteredData);
  renderTable();
}

// Filter the annual array based on state variables
function getFilteredAnnualData() {
  return ibgeGrapesData.annual.filter(item => item.year >= startYear && item.year <= endYear);
}

// Format numbers nicely
function formatNum(value, style = 'decimal') {
  if (value === undefined || value === null) return '-';
  
  if (style === 'percent') {
    return (value >= 0 ? '+' : '') + value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  }
  
  return Math.round(value).toLocaleString('pt-BR');
}

// Calculate KPIs
function calculateKPIs(data) {
  if (data.length === 0) return;

  // Produção total in the period
  const totalProducao = data.reduce((sum, item) => sum + item[currentTerritory].producao, 0);
  document.getElementById('kpi-producao-val').textContent = formatNum(totalProducao) + ' t';

  // Area plantada average or latest
  const avgAreaPlantada = data.reduce((sum, item) => sum + item[currentTerritory].area_plantada, 0) / data.length;
  document.getElementById('kpi-area-plantada-val').textContent = formatNum(avgAreaPlantada) + ' ha';

  // Area colhida average
  const avgAreaColhida = data.reduce((sum, item) => sum + item[currentTerritory].area_colhida, 0) / data.length;
  document.getElementById('kpi-area-colhida-val').textContent = formatNum(avgAreaColhida) + ' ha';

  // Rendimento médio average
  const avgRendimento = data.reduce((sum, item) => sum + item[currentTerritory].rendimento_medio, 0) / data.length;
  document.getElementById('kpi-rendimento-val').textContent = formatNum(avgRendimento) + ' kg/ha';

  // Trends calculation
  const startVal = data[0][currentTerritory].producao;
  const endVal = data[data.length - 1][currentTerritory].producao;
  const growth = startVal > 0 ? ((endVal - startVal) / startVal) * 100 : 0;
  
  const growthElement = document.getElementById('kpi-crescimento-val');
  growthElement.textContent = formatNum(growth, 'percent');
  if (growth >= 0) {
    growthElement.style.color = '#2ECC71';
  } else {
    growthElement.style.color = '#E74C3C';
  }

  // Record years
  let maxProd = -1;
  let maxYear = 2006;
  let minProd = Infinity;
  let minYear = 2006;

  data.forEach(item => {
    const prod = item[currentTerritory].producao;
    if (prod > maxProd) {
      maxProd = prod;
      maxYear = item.year;
    }
    if (prod < minProd && prod > 0) {
      minProd = prod;
      minYear = item.year;
    }
  });

  document.getElementById('kpi-recordes-val').textContent = `${maxYear}`;
  document.getElementById('kpi-pior-ano').textContent = `${minYear} (${formatNum(minProd)} t)`;

  // Trends relative to first year
  const pTrend = document.getElementById('kpi-producao-trend');
  const pGrowth = startVal > 0 ? ((endVal - startVal) / startVal) * 100 : 0;
  pTrend.className = pGrowth >= 0 ? 'kpi-trend-up' : 'kpi-trend-down';
  pTrend.innerHTML = pGrowth >= 0 
    ? `<i class="fa-solid fa-arrow-trend-up"></i> ${formatNum(pGrowth, 'percent')}` 
    : `<i class="fa-solid fa-arrow-trend-down"></i> ${formatNum(pGrowth, 'percent')}`;

  const apStart = data[0][currentTerritory].area_plantada;
  const apEnd = data[data.length - 1][currentTerritory].area_plantada;
  const apGrowth = apStart > 0 ? ((apEnd - apStart) / apStart) * 100 : 0;
  const apTrend = document.getElementById('kpi-area-plantada-trend');
  apTrend.className = apGrowth >= 0 ? 'kpi-trend-up' : 'kpi-trend-down';
  apTrend.innerHTML = apGrowth >= 0 
    ? `<i class="fa-solid fa-arrow-trend-up"></i> ${formatNum(apGrowth, 'percent')}` 
    : `<i class="fa-solid fa-arrow-trend-down"></i> ${formatNum(apGrowth, 'percent')}`;

  // Area colhida percentage of plantada
  const acPercent = avgAreaPlantada > 0 ? (avgAreaColhida / avgAreaPlantada) * 100 : 0;
  document.getElementById('kpi-area-colhida-trend').innerHTML = `<i class="fa-solid fa-circle-info"></i> ${formatNum(acPercent)}%`;

  // Rendimento trend indicator
  const rendStart = data[0][currentTerritory].rendimento_medio;
  const rendEnd = data[data.length - 1][currentTerritory].rendimento_medio;
  const rendGrowth = rendStart > 0 ? ((rendEnd - rendStart) / rendStart) * 100 : 0;
  const rTrend = document.getElementById('kpi-rendimento-trend');
  rTrend.className = rendGrowth >= 0 ? 'kpi-trend-up' : 'kpi-trend-down';
  rTrend.innerHTML = rendGrowth >= 0 
    ? `<i class="fa-solid fa-arrow-trend-up"></i> ${formatNum(rendGrowth, 'percent')}` 
    : `<i class="fa-solid fa-arrow-trend-down"></i> ${formatNum(rendGrowth, 'percent')}`;
}

// 1. Evolução Histórica da Produção Chart
function renderProducaoChart(data) {
  const years = data.map(item => item.year);
  const values = data.map(item => item[currentTerritory].producao);

  const options = {
    series: [{
      name: 'Produção (Toneladas)',
      data: values
    }],
    chart: {
      type: 'area',
      height: 350,
      fontFamily: 'Poppins, sans-serif',
      toolbar: { show: false }
    },
    colors: ['#6D071A'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.1,
        stops: [0, 90, 100]
      }
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    markers: {
      size: 5,
      colors: ['#D4AF37'],
      strokeColors: '#6D071A',
      strokeWidth: 2,
      hover: { size: 7 }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: years,
      labels: {
        style: { colors: '#6C757D' }
      }
    },
    yaxis: {
      labels: {
        formatter: (val) => formatNum(val),
        style: { colors: '#6C757D' }
      }
    },
    tooltip: {
      y: {
        formatter: (val) => formatNum(val) + ' toneladas'
      }
    },
    grid: {
      borderColor: '#E9ECEF',
      strokeDashArray: 4
    }
  };

  if (chartProducao) {
    chartProducao.destroy();
  }
  chartProducao = new ApexCharts(document.querySelector("#chart-producao-historica"), options);
  chartProducao.render();
}

// 2. Comparação Área Plantada vs Área Colhida Chart
function renderAreasChart(data) {
  const years = data.map(item => item.year);
  const plantada = data.map(item => item[currentTerritory].area_plantada);
  const colhida = data.map(item => item[currentTerritory].area_colhida);

  const options = {
    series: [
      {
        name: 'Área Plantada (Hectares)',
        data: plantada
      },
      {
        name: 'Área Colhida (Hectares)',
        data: colhida
      }
    ],
    chart: {
      type: 'line',
      height: 350,
      fontFamily: 'Poppins, sans-serif',
      toolbar: { show: false }
    },
    colors: ['#6D071A', '#D4AF37'],
    stroke: {
      width: [3, 3],
      dashArray: [0, 5]
    },
    markers: {
      size: 4
    },
    xaxis: {
      categories: years,
      labels: { style: { colors: '#6C757D' } }
    },
    yaxis: {
      labels: {
        formatter: (val) => formatNum(val),
        style: { colors: '#6C757D' }
      }
    },
    tooltip: {
      y: {
        formatter: (val) => formatNum(val) + ' ha'
      }
    },
    grid: {
      borderColor: '#E9ECEF',
      strokeDashArray: 4
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right'
    }
  };

  if (chartAreas) {
    chartAreas.destroy();
  }
  chartAreas = new ApexCharts(document.querySelector("#chart-areas-comparacao"), options);
  chartAreas.render();
}

// 3. Rendimento Médio Chart
function renderRendimentoChart(data) {
  const years = data.map(item => item.year);
  const rendimento = data.map(item => item[currentTerritory].rendimento_medio);

  const options = {
    series: [{
      name: 'Rendimento Médio (Kg/Ha)',
      data: rendimento
    }],
    chart: {
      type: 'bar',
      height: 350,
      fontFamily: 'Poppins, sans-serif',
      toolbar: { show: false }
    },
    colors: ['#6D071A'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '55%',
        distributed: false
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: years,
      labels: { style: { colors: '#6C757D' } }
    },
    yaxis: {
      labels: {
        formatter: (val) => formatNum(val),
        style: { colors: '#6C757D' }
      }
    },
    tooltip: {
      y: {
        formatter: (val) => formatNum(val) + ' kg/ha'
      }
    },
    grid: {
      borderColor: '#E9ECEF',
      strokeDashArray: 4
    }
  };

  if (chartRendimento) {
    chartRendimento.destroy();
  }
  chartRendimento = new ApexCharts(document.querySelector("#chart-rendimento-medio"), options);
  chartRendimento.render();
}

// 4. Sazonalidade (Progresso da Estimativa Mensal no Ano Selecionado)
function renderSeasonalityChart() {
  // Filter monthly data for the selected year
  const monthlyData = ibgeGrapesData.monthly.filter(item => item.year === seasonalityYear);
  
  // Sort months chronologically
  const months = monthlyData.map(item => item.month);
  const values = monthlyData.map(item => item[currentTerritory][currentIndicator]);

  // Translate label
  let indLabel = '';
  switch(currentIndicator) {
    case 'producao': indLabel = 'Produção (Toneladas)'; break;
    case 'area_plantada': indLabel = 'Área Plantada (Hectares)'; break;
    case 'area_colhida': indLabel = 'Área Colhida (Hectares)'; break;
    case 'rendimento_medio': indLabel = 'Rendimento Médio (Kg/Ha)'; break;
  }

  const options = {
    series: [{
      name: indLabel,
      data: values
    }],
    chart: {
      type: 'bar',
      height: 350,
      fontFamily: 'Poppins, sans-serif',
      toolbar: { show: false }
    },
    colors: ['#D4AF37'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        barHeight: '70%'
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      labels: {
        formatter: (val) => formatNum(val),
        style: { colors: '#6C757D' }
      }
    },
    yaxis: {
      categories: months,
      labels: { style: { colors: '#6C757D' } }
    },
    tooltip: {
      y: {
        formatter: (val) => formatNum(val)
      }
    },
    grid: {
      borderColor: '#E9ECEF',
      strokeDashArray: 4
    }
  };

  if (chartSazonalidade) {
    chartSazonalidade.destroy();
  }
  chartSazonalidade = new ApexCharts(document.querySelector("#chart-sazonalidade"), options);
  chartSazonalidade.render();
}

// 5. Tendência Futura da Produção com Projeção Linear (Regressão Linear)
function renderTendenciaChart(data) {
  if (data.length === 0) return;

  // We compute regression line based on current selection
  const x = data.map(item => item.year);
  const y = data.map(item => item[currentTerritory].producao);
  const n = x.length;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
  }

  // Slope and intercept
  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const b = (sumY - m * sumX) / n;

  // Historical series regression line points
  const histTrend = x.map(year => Math.round(m * year + b));

  // Future projections (next 5 years)
  const lastYear = x[x.length - 1];
  const projYears = [];
  const projTrend = [];
  const projReal = [];

  for (let i = 1; i <= 5; i++) {
    const yr = lastYear + i;
    projYears.push(yr);
    projTrend.push(Math.round(m * yr + b));
    projReal.push(null); // Placeholders for series aligning
  }

  // Combined X axis categories
  const categories = [...x, ...projYears];
  
  // Real values series (Historical + nulls for future)
  const realSeriesData = [...y, ...Array(5).fill(null)];

  // Projection values series (nulls for hist + projection values starting at last historical value)
  const projSeriesData = [...Array(n - 1).fill(null), y[n - 1], ...projTrend];

  const options = {
    series: [
      {
        name: 'Dados Reais / Estimativas IBGE',
        type: 'line',
        data: realSeriesData
      },
      {
        name: 'Projeção de Tendência Linear',
        type: 'line',
        data: projSeriesData
      }
    ],
    chart: {
      height: 380,
      type: 'line',
      fontFamily: 'Poppins, sans-serif',
      toolbar: { show: false }
    },
    colors: ['#6D071A', '#D4AF37'],
    stroke: {
      width: [4, 3],
      curve: 'smooth',
      dashArray: [0, 6]
    },
    markers: {
      size: [5, 0],
      colors: ['#6D071A'],
      strokeColors: '#FFFFFF',
      strokeWidth: 2
    },
    xaxis: {
      categories: categories,
      labels: { style: { colors: '#6C757D' } }
    },
    yaxis: {
      labels: {
        formatter: (val) => formatNum(val),
        style: { colors: '#6C757D' }
      }
    },
    tooltip: {
      shared: true,
      y: {
        formatter: (val) => val ? formatNum(val) + ' toneladas' : null
      }
    },
    grid: {
      borderColor: '#E9ECEF',
      strokeDashArray: 4
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center'
    },
    annotations: {
      xaxis: [{
        x: lastYear.toString(),
        borderColor: '#9E9E9E',
        label: {
          style: {
            color: '#fff',
            background: '#6D071A'
          },
          text: 'Fim dos Dados Históricos'
        }
      }]
    }
  };

  if (chartTendencia) {
    chartTendencia.destroy();
  }
  chartTendencia = new ApexCharts(document.querySelector("#chart-tendencia-projetada"), options);
  chartTendencia.render();
}

// Render the data table with sorting and filtering
function renderTable() {
  const data = getFilteredAnnualData();
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  // Apply search
  let processedData = data.filter(item => {
    const yearStr = item.year.toString();
    const prodStr = item[currentTerritory].producao.toString();
    const apStr = item[currentTerritory].area_plantada.toString();
    const acStr = item[currentTerritory].area_colhida.toString();
    const rendStr = item[currentTerritory].rendimento_medio.toString();
    
    return yearStr.includes(tableSearchQuery) || 
           prodStr.includes(tableSearchQuery) || 
           apStr.includes(tableSearchQuery) || 
           acStr.includes(tableSearchQuery) || 
           rendStr.includes(tableSearchQuery);
  });

  // Sort
  processedData.sort((a, b) => {
    let valA, valB;
    
    if (tableSortKey === 'year') {
      valA = a.year;
      valB = b.year;
    } else {
      valA = a[currentTerritory][tableSortKey];
      valB = b[currentTerritory][tableSortKey];
    }

    if (valA < valB) return tableSortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return tableSortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  if (processedData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-light); padding: 2rem;">Nenhum dado encontrado</td></tr>`;
    return;
  }

  processedData.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${item.year}</strong></td>
      <td>${formatNum(item[currentTerritory].producao)} t</td>
      <td>${formatNum(item[currentTerritory].area_plantada)} ha</td>
      <td>${formatNum(item[currentTerritory].area_colhida)} ha</td>
      <td>${formatNum(item[currentTerritory].rendimento_medio)} kg/ha</td>
    `;
    tbody.appendChild(tr);
  });
}
