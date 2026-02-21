/**
 * script.js - Logjika kryesore JavaScript për Protein Interaction Visualizer
 * Përmban të gjitha funksionet për ndërveprimin me backend dhe 3D visualization
 */

// ========================================
// VARIABLAT GLOBALE
// ========================================

// Ruajtja e të dhënave të proteinave
let proteinFiles = {};
let proteinData = {};
let currentViewer = null;
let dockingData = null;

// Konfigurimi i API-së
const API_BASE_URL = 'http://localhost:5000';

// Cache për performancë më të mirë
const cache = new Map();

// Gjendja e aplikacionit
const appState = {
    proteinsLoaded: 0,
    isDocking: false,
    currentModal: null
};

// ========================================
// INICIALIZATION
// ========================================

/**
 * Inicializon aplikacionin kur faqja ngarkohet
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🧬 Protein Interaction Visualizer u inicializua');
    
    // Inicializon viewer-in kryesor
    initializeMainViewer();
    
    // Shton event listener për keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Kontrollon lidhjen me backend
    checkBackendConnection();
    
    // Inicializon tooltips dhe help
    initializeTooltips();
    
    // Setup për responsiveness
    setupResponsiveHandlers();
    
    // Kontrollon dependencat
    checkDependencies();
    
    console.log('✅ Aplikacioni është gati për përdorim');
});

/**
 * Inicializon viewer-in kryesor 3D
 */
function initializeMainViewer() {
    try {
        const viewerElement = document.getElementById('viewer');
        if (viewerElement && window.$3Dmol) {
            currentViewer = $3Dmol.createViewer(viewerElement, {
                defaultcolors: $3Dmol.rasmolElementColors
            });
            
            // Vendos një mesazh fillestar
            showViewerMessage('Ngarkoni proteina për të filluar vizualizimin');
            
            console.log('✅ Viewer 3D u inicializua me sukses');
        } else {
            console.error('❌ Gabim në inicializimin e viewer 3D');
            showToast('Gabim në ngarkimin e viewer 3D', 'error');
        }
    } catch (error) {
        console.error('❌ Gabim në inicializimin e viewer:', error);
        showToast('Gabim në inicializimin e viewer 3D', 'error');
    }
}

/**
 * Tregon një mesazh në viewer kur nuk ka strukturë të ngarkuar
 */
function showViewerMessage(message) {
    const viewerElement = document.getElementById('viewer');
    if (viewerElement) {
        viewerElement.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; 
                        color: #757575; font-size: 1.2rem; text-align: center; padding: 2rem;">
                <div>
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🧬</div>
                    <div>${message}</div>
                </div>
            </div>
        `;
    }
}

/**
 * Kontrollon lidhjen me backend API
 */
async function checkBackendConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/`, {
            method: 'GET'
        });
        
        if (response.ok) {
            console.log('✅ Lidhja me backend u vendos me sukses');
            showToast('Lidhja me serverin është aktive', 'success');
        } else {
            throw new Error('Backend nuk u arrit');
        }
    } catch (error) {
        console.error('❌ Gabim në lidhjen me backend:', error);
        showToast('Gabim në lidhjen me serverin. Kontrolloni nëse backend është aktiv.', 'error');
    }
}

/**
 * Setup për keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
        // ESC për mbylljen e modaleve
        if (event.key === 'Escape') {
            closeAllModals();
        }
        
        // Ctrl+Enter për docking
        if (event.ctrlKey && event.key === 'Enter') {
            if (appState.proteinsLoaded >= 2) {
                combineProteins();
            }
        }
        
        // F11 për fullscreen të viewer
        if (event.key === 'F11') {
            event.preventDefault();
            toggleFullscreen();
        }
        
        // Ctrl+R për reset viewer
        if (event.ctrlKey && event.key === 'r') {
            event.preventDefault();
            resetViewer();
        }
    });
}

/**
 * Setup për responsive behavior
 */
function setupResponsiveHandlers() {
    window.addEventListener('resize', function() {
        // Përditëso viewer kur ndryshon madhësia e dritares
        if (currentViewer) {
            setTimeout(() => {
                currentViewer.resize();
            }, 100);
        }
    });
}

/**
 * Inicializon tooltips dhe help system
 */
function initializeTooltips() {
    // Shton tooltips për butonët
    const buttons = document.querySelectorAll('[title]');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', showTooltip);
        button.addEventListener('mouseleave', hideTooltip);
    });
}

// ========================================
// FUNKSIONET KRYESORE
// ========================================

/**
 * Ngarkon një proteinë nga API
 */
async function loadProtein(proteinNumber) {
    const inputId = `protein${proteinNumber}`;
    const proteinName = document.getElementById(inputId).value.trim();
    
    if (!proteinName) {
        showToast('Vendosni emrin e proteinës', 'warning');
        return;
    }
    
    // Kontrollon cache-in
    const cacheKey = `protein_${proteinName.toLowerCase()}`;
    if (cache.has(cacheKey)) {
        console.log(`📦 Proteina "${proteinName}" u gjet në cache`);
        const cachedData = cache.get(cacheKey);
        handleProteinData(cachedData, proteinNumber);
        return;
    }
    
    showLoading(true, `Duke kërkuar proteinën "${proteinName}"...`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/protein`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ protein: proteinName })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Gabim i panjohur në server');
        }
        
        // Ruaj në cache
        cache.set(cacheKey, data);
        
        // Procesoj të dhënat
        handleProteinData(data, proteinNumber);
        
        console.log(`✅ Proteina "${proteinName}" u ngarkua me sukses`);
        
    } catch (error) {
        console.error(`❌ Gabim në ngarkimin e proteinës "${proteinName}":`, error);
        showToast(`Gabim: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Trajton të dhënat e proteinës pas ngarkimit
 */
function handleProteinData(data, proteinNumber) {
    // Ruaj të dhënat
    proteinFiles[`file${proteinNumber}`] = data.file_path;
    proteinData[`protein${proteinNumber}`] = data;
    
    // Përditëso gjendjen
    appState.proteinsLoaded++;
    
    // Aktivizo butonin e docking nëse të dy proteinat janë ngarkuar
    updateDockingButton();
    
    // Trego statusin
    showStatus(`Proteina ${proteinNumber} u ngarkua: ${data.info.name}`, 'success');
    
    // Hap modalin me informacionet
    showProteinModal(data.pdb_text, data.info, proteinNumber);
}

/**
 * Përditëson gjendjen e butonit të docking
 */
function updateDockingButton() {
    const dockButton = document.getElementById('dockButton');
    if (dockButton) {
        if (appState.proteinsLoaded >= 2) {
            dockButton.disabled = false;
            dockButton.querySelector('.button-subtext').textContent = 'Klikoni për të simuluar bashkimin';
            dockButton.classList.add('animate-bounce');
        } else {
            dockButton.disabled = true;
            dockButton.querySelector('.button-subtext').textContent = 'Ngarko të dy proteinat fillimisht';
            dockButton.classList.remove('animate-bounce');
        }
    }
}

/**
 * Simulon bashkimin e dy proteinava
 */
async function combineProteins() {
    const { file1, file2 } = proteinFiles;
    
    if (!file1 || !file2) {
        showToast('Ngarko të dy proteinat para se t\'i bashkosh', 'warning');
        return;
    }
    
    if (appState.isDocking) {
        showToast('Simulimi është në proces...', 'info');
        return;
    }
    
    appState.isDocking = true;
    showLoading(true, 'Duke simuluar bashkimin e proteinave...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/dock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file1, file2 })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Gabim në simulimin e bashkimit');
        }
        
        // Ruaj të dhënat e docking
        dockingData = data;
        
        // Vizualizo strukturën e kombinuar
        await visualizeCombinedStructure(data);
        
        // Trego analizën
        showDockingAnalysis(data);
        
        showStatus('Bashkimi u simulua me sukses!', 'success');
        console.log('✅ Simulimi i bashkimit u përfundua me sukses');
        
    } catch (error) {
        console.error('❌ Gabim në simulimin e bashkimit:', error);
        showToast(`Gabim në simulim: ${error.message}`, 'error');
    } finally {
        appState.isDocking = false;
        showLoading(false);
    }
}

// ========================================
// VIZUALIZIMI 3D
// ========================================

/**
 * Vizualizo strukturën e kombinuar në viewer kryesor
 */
async function visualizeCombinedStructure(dockingData) {
    if (!currentViewer || !dockingData.combined_pdb_content) {
        throw new Error('Viewer ose të dhënat mungojnë');
    }
    
    try {
        // Pastro viewer-in
        currentViewer.clear();
        
        // Ngarko strukturën e kombinuar
        currentViewer.addModel(dockingData.combined_pdb_content, "pdb");
        
        // Ngjyros chain-et në mënyrë të ndryshme
        currentViewer.setStyle({chain: 'A'}, { 
            cartoon: { 
                color: '#1e88e5',
                opacity: 0.8 
            } 
        });
        
        currentViewer.setStyle({chain: 'B'}, { 
            cartoon: { 
                color: '#d32f2f',
                opacity: 0.8 
            } 
        });
        
        // Shton etiketa
        addProteinLabels();
        
        // Përqendro pamjen
        currentViewer.zoomTo();
        currentViewer.render();
        
        // Aktivo rotacionin automatik
        startAutoRotation();
        
        console.log('✅ Struktura e kombinuar u vizualizua');
        
    } catch (error) {
        console.error('❌ Gabim në vizualizimin e strukturës:', error);
        throw error;
    }
}

/**
 * Shton etiketa për proteinat
 */
function addProteinLabels() {
    if (!currentViewer) return;
    
    try {
        // Etiketë për proteinën e parë
        currentViewer.addLabel("Proteina 1", {
            position: {x: -15, y: 0, z: 0},
            backgroundColor: '#1e88e5',
            fontColor: 'white',
            fontSize: 14,
            showBackground: true
        });
        
        // Etiketë për proteinën e dytë
        currentViewer.addLabel("Proteina 2", {
            position: {x: 15, y: 0, z: 0},
            backgroundColor: '#d32f2f',
            fontColor: 'white',
            fontSize: 14,
            showBackground: true
        });
        
    } catch (error) {
        console.error('⚠️ Gabim në shtimin e etiketave:', error);
    }
}

/**
 * Fillon rotacionin automatik
 */
function startAutoRotation() {
    if (!currentViewer) return;
    
    let angle = 0;
    const rotationInterval = setInterval(() => {
        if (currentViewer && !document.querySelector('.modal.show')) {
            angle += 1;
            currentViewer.rotate(1, 'y');
            currentViewer.render();
        }
        
        // Ndal rotacionin pas 30 sekondash
        if (angle >= 360) {
            clearInterval(rotationInterval);
        }
    }, 100);
}

// ========================================
// MODAL MANAGEMENT
// ========================================

/**
 * Tregon modalin e informacioneve të proteinës
 */
function showProteinModal(pdbText, info, proteinNumber) {
    const modal = document.getElementById('proteinModal');
    appState.currentModal = 'protein';
    
    // Vendos informacionet
    document.getElementById('modalInfo').innerHTML = formatProteinInfo(info);
    document.getElementById('modalStructureInfo').innerHTML = formatStructureInfo(info);
    
    // Krijon viewer për modal
    createModalViewer('modalViewer', pdbText, proteinNumber);
    
    // Trego modalin
    showModal(modal);
}

/**
 * Krijon viewer 3D për modal
 */
function createModalViewer(containerId, pdbText, proteinNumber = 1) {
    try {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Pastro përmbajtjen e mëparshme
        container.innerHTML = '';
        
        // Krijo viewer të ri
        const modalViewer = $3Dmol.createViewer(container);
        modalViewer.addModel(pdbText, "pdb");
        
        // Ngjyros sipas numrit të proteinës
        const color = proteinNumber === 1 ? '#1e88e5' : '#d32f2f';
        modalViewer.setStyle({}, { 
            cartoon: { 
                color: color,
                opacity: 0.9 
            } 
        });
        
        modalViewer.zoomTo();
        modalViewer.render();
        
        // Ruaj reference-in për kontroll më vonë
        container._viewer = modalViewer;
        
    } catch (error) {
        console.error('❌ Gabim në krijimin e modal viewer:', error);
    }
}

/**
 * Formatimi i informacioneve të proteinës
 */
function formatProteinInfo(info) {
    return `
        <div class="info-item">
            <div class="info-label">Emri:</div>
            <div class="info-value">${info.name || 'I panjohur'}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Organizmi:</div>
            <div class="info-value">${info.organism || 'I panjohur'}</div>
        </div>
        <div class="info-item">
            <div class="info-label">UniProt ID:</div>
            <div class="info-value">${info.uniprot_id || 'I panjohur'}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Gjatësia:</div>
            <div class="info-value">${info.length || 0} aminoacide</div>
        </div>
        <div class="info-item">
            <div class="info-label">Funksioni:</div>
            <div class="info-value">${info.function || 'I panjohur'}</div>
        </div>
    `;
}

/**
 * Formatimi i informacioneve të strukturës
 */
function formatStructureInfo(info) {
    return `
        <div class="info-item">
            <div class="info-label">Numri i atomeve:</div>
            <div class="info-value">${info.atom_count || 0}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Cilësia e strukturës:</div>
            <div class="info-value">${info.structure_quality || 'I panjohur'}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Rezolucioni:</div>
            <div class="info-value">${info.resolution || 'N/A'}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Chain-et:</div>
            <div class="info-value">${info.chain_count || 1}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Aminoacidet:</div>
            <div class="info-value">${info.amino_acids ? info.amino_acids.join(', ') : 'N/A'}</div>
        </div>
    `;
}

/**
 * Tregon analizën e bashkimit
 */
function showDockingAnalysis(dockingData) {
    const modal = document.getElementById('dockingModal');
    appState.currentModal = 'docking';
    
    // Krijon viewer për modal
    createDockingModalViewer(dockingData.combined_pdb_content);
    
    // Vendos analizën
    const analysis = dockingData.interaction_analysis;
    document.getElementById('dockingAnalysis').innerHTML = formatDockingAnalysis(analysis);
    
    // Trego modalin
    showModal(modal);
}

/**
 * Krijon viewer për modal të docking
 */
function createDockingModalViewer(pdbContent) {
    try {
        const container = document.getElementById('dockingViewer');
        if (!container) return;
        
        container.innerHTML = '';
        
        const viewer = $3Dmol.createViewer(container);
        viewer.addModel(pdbContent, "pdb");
        
        // Ngjyros chain-et
        viewer.setStyle({chain: 'A'}, { cartoon: { color: '#1e88e5' } });
        viewer.setStyle({chain: 'B'}, { cartoon: { color: '#d32f2f' } });
        
        viewer.zoomTo();
        viewer.render();
        
        container._viewer = viewer;
        
    } catch (error) {
        console.error('❌ Gabim në krijimin e docking viewer:', error);
    }
}

/**
 * Formatimi i analizës së bashkimit
 */
function formatDockingAnalysis(analysis) {
    return `
        <div class="energy-display">
            <div class="energy-value">${analysis.binding_energy}</div>
            <div class="energy-unit">kcal/mol</div>
        </div>
        
        <div class="info-item">
            <div class="info-label">Forca e Ndërveprimit:</div>
            <div class="info-value">${analysis.interaction_strength}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label">Sipërfaqja e Kontaktit:</div>
            <div class="info-value">${analysis.contact_surface_area} Ų</div>
        </div>
        
        <div class="interactions-grid">
            <div class="interaction-item">
                <span class="interaction-count">${analysis.potential_interactions.hydrogen_bonds}</span>
                <span class="interaction-label">Lidhje Hidrogeni</span>
            </div>
            <div class="interaction-item">
                <span class="interaction-count">${analysis.potential_interactions.electrostatic_interactions}</span>
                <span class="interaction-label">Ndërveprime Elektrostatike</span>
            </div>
            <div class="interaction-item">
                <span class="interaction-count">${analysis.potential_interactions.hydrophobic_interactions}</span>
                <span class="interaction-label">Ndërveprime Hidrofobike</span>
            </div>
            <div class="interaction-item">
                <span class="interaction-count">${analysis.potential_interactions.van_der_waals}</span>
                <span class="interaction-label">Forcat van der Waals</span>
            </div>
        </div>
        
        <div class="info-item">
            <div class="info-label">Atomet totale:</div>
            <div class="info-value">${analysis.total_atoms}</div>
        </div>
        
        <div class="info-section">
            <h4>Përmbledhje e Analizës</h4>
            <p>${analysis.analysis_summary}</p>
        </div>
    `;
}

/**
 * Trego modal generik
 */
function showModal(modal) {
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        
        // Focus në modal për accessibility
        const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }
}

/**
 * Mbyll modalin e proteinës
 */
function closeModal() {
    const modal = document.getElementById('proteinModal');
    closeModalGeneric(modal);
}

/**
 * Mbyll modalin e docking
 */
function closeDockingModal() {
    const modal = document.getElementById('dockingModal');
    closeModalGeneric(modal);
}

/**
 * Mbyll modal generik
 */
function closeModalGeneric(modal) {
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        
        // Pastro viewer-in e modalit
        const viewers = modal.querySelectorAll('[id$="Viewer"]');
        viewers.forEach(viewerElement => {
            viewerElement.innerHTML = '';
        });
        
        appState.currentModal = null;
    }
}

/**
 * Mbyll të gjitha modalet
 */
function closeAllModals() {
    closeModal();
    closeDockingModal();
    closeHelpModal();
}

// ========================================
// UI HELPERS
// ========================================

/**
 * Tregon loading screen
 */
function showLoading(show, message = 'Duke procesuar...') {
    const loadingDiv = document.getElementById('loadingDiv');
    const loadingText = document.getElementById('loadingText');
    
    if (loadingDiv) {
        loadingDiv.style.display = show ? 'block' : 'none';
        if (loadingText && message) {
            loadingText.textContent = message;
        }
    }
    
    // Animacion i progress bar
    if (show) {
        animateProgressBar();
    }
}

/**
 * Animacion për progress bar
 */
function animateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = '0%';
        setTimeout(() => {
            progressBar.style.width = '100%';
        }, 100);
    }
}

/**
 * Tregon status message
 */
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('statusDisplay');
    const statusMessage = document.getElementById('statusMessage');
    const statusIcon = document.getElementById('statusIcon');
    
    if (statusDiv && statusMessage) {
        // Icons për lloje të ndryshme statusesh
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        
        statusMessage.textContent = message;
        if (statusIcon) {
            statusIcon.textContent = icons[type] || icons.info;
        }
        
        statusDiv.style.display = 'block';
        statusDiv.className = `status-section ${type}`;
        
        // Auto-hide pas disa sekondash
        setTimeout(() => {
            if (statusDiv.style.display !== 'none') {
                statusDiv.style.display = 'none';
            }
        }, 5000);
    }
}

/**
 * Tregon toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        // Krijon container nëse nuk ekziston
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    const finalContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    finalContainer.appendChild(toast);
    
    // Auto-remove pas 4 sekondash
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// ========================================
// VIEWER CONTROLS
// ========================================

/**
 * Rivendos viewer-in në pozicionin fillestar
 */
function resetViewer() {
    if (currentViewer) {
        currentViewer.zoomTo();
        currentViewer.render();
        showToast('Viewer u rivendos', 'info');
    }
}

/**
 * Toggle fullscreen për viewer
 */
function toggleFullscreen() {
    const viewerElement = document.getElementById('viewer');
    if (!viewerElement) return;
    
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        viewerElement.requestFullscreen().catch(err => {
            console.error('Gabim në fullscreen:', err);
            showToast('Fullscreen nuk u aktivizua', 'warning');
        });
    }
}

/**
 * Merr screenshot të viewer
 */
function takeScreenshot() {
    if (currentViewer) {
        try {
            const dataURL = currentViewer.pngURI();
            
            // Krijon link për download
            const link = document.createElement('a');
            link.download = `protein_structure_${Date.now()}.png`;
            link.href = dataURL;
            link.click();
            
            showToast('Screenshot u ruajt', 'success');
        } catch (error) {
            console.error('Gabim në screenshot:', error);
            showToast('Gabim në ruajtjen e screenshot', 'error');
        }
    }
}

/**
 * Rrotullo viewer-in në modal
 */
function rotateModalViewer() {
    const modalViewer = document.getElementById('modalViewer')?._viewer;
    if (modalViewer) {
        modalViewer.rotate(90, 'y');
        modalViewer.render();
    }
}

/**
 * Toggle pamja e docking viewer
 */
function toggleDockingView() {
    const dockingViewer = document.getElementById('dockingViewer')?._viewer;
    if (dockingViewer) {
        // Ndrysho stilin e vizualizimit
        dockingViewer.setStyle({}, { 
            stick: { 
                radius: 0.2,
                colorscheme: 'chain' 
            } 
        });
        dockingViewer.render();
    }
}

/**
 * Thekso ndërveprimet në docking viewer
 */
function highlightInteractions() {
    const dockingViewer = document.getElementById('dockingViewer')?._viewer;
    if (dockingViewer) {
        // Shto efekte për zona të kontaktit
        dockingViewer.addSphere({
            center: {x: 0, y: 0, z: 0},
            radius: 5.0,
            color: '#7b1fa2',
            alpha: 0.3
        });
        dockingViewer.render();
        
        showToast('Zonat e kontaktit u theksuan', 'info');
    }
}

// ========================================
// EXPORT FUNCTIONS
// ========================================

/**
 * Eksporton strukturën PDB
 */
function exportPDB() {
    if (!dockingData || !dockingData.combined_pdb_content) {
        showToast('Nuk ka strukturë për eksport', 'warning');
        return;
    }
    
    try {
        const blob = new Blob([dockingData.combined_pdb_content], {
            type: 'text/plain'
        });
        
        const link = document.createElement('a');
        link.download = `combined_structure_${Date.now()}.pdb`;
        link.href = URL.createObjectURL(blob);
        link.click();
        
        showToast('Skedari PDB u eksportua', 'success');
    } catch (error) {
        console.error('Gabim në eksportimin e PDB:', error);
        showToast('Gabim në eksportim', 'error');
    }
}

/**
 * Eksporton imazh të strukturës
 */
function exportImage() {
    const dockingViewer = document.getElementById('dockingViewer')?._viewer;
    if (dockingViewer) {
        try {
            const dataURL = dockingViewer.pngURI();
            
            const link = document.createElement('a');
            link.download = `docking_structure_${Date.now()}.png`;
            link.href = dataURL;
            link.click();
            
            showToast('Imazhi u eksportua', 'success');
        } catch (error) {
            console.error('Gabim në eksportimin e imazhit:', error);
            showToast('Gabim në eksportimin e imazhit', 'error');
        }
    }
}

/**
 * Eksporton raport të plotë
 */
function exportReport() {
    if (!dockingData) {
        showToast('Nuk ka të dhëna për raport', 'warning');
        return;
    }
    
    try {
        const report = generateFullReport(dockingData);
        
        const blob = new Blob([report], {
            type: 'text/plain'
        });
        
        const link = document.createElement('a');
        link.download = `protein_docking_report_${Date.now()}.txt`;
        link.href = URL.createObjectURL(blob);
        link.click();
        
        showToast('Raporti u eksportua', 'success');
    } catch (error) {
        console.error('Gabim në eksportimin e raportit:', error);
        showToast('Gabim në eksportimin e raportit', 'error');
    }
}

/**
 * Gjeneron raport të plotë
 */
function generateFullReport(dockingData) {
    const analysis = dockingData.interaction_analysis;
    const timestamp = new Date().toISOString();
    
    return `
RAPORTI I ANALIZËS SË BASHKIMIT TË PROTEINAVE
============================================

Data e krijimit: ${timestamp}
Software: Protein Interaction Visualizer v1.0

INFORMACIONE TË PËRGJITHSHME
----------------------------
Proteina 1: ${dockingData.protein_1_file}
Proteina 2: ${dockingData.protein_2_file}
Struktura e kombinuar: ${dockingData.combined_structure_file}

REZULTATET E ANALIZËS
--------------------
Energjia e bashkimit: ${analysis.binding_energy} kcal/mol
Forca e ndërveprimit: ${analysis.interaction_strength}
Sipërfaqja e kontaktit: ${analysis.contact_surface_area} Ų

NDËRVEPRIMET E IDENTIFIKUARA
---------------------------
Lidhje hidrogeni: ${analysis.potential_interactions.hydrogen_bonds}
Ndërveprime elektrostatike: ${analysis.potential_interactions.electrostatic_interactions}
Ndërveprime hidrofobike: ${analysis.potential_interactions.hydrophobic_interactions}
Forcat van der Waals: ${analysis.potential_interactions.van_der_waals}

STATISTIKAT E STRUKTURËS
------------------------
Atomet e proteinës 1: ${analysis.protein1_atoms}
Atomet e proteinës 2: ${analysis.protein2_atoms}
Totali i atomeve: ${analysis.total_atoms}

PËRMBLEDHJA E ANALIZËS
---------------------
${analysis.analysis_summary}

METODOLOGJIA
------------
Simulimi i bashkimit u krye duke përdorur algoritme të thjeshtësuara të docking-ut.
Strukturat u pozicionuan në distancë optimale dhe u analizuan ndërveprimet e mundshme.
Energjia e bashkimit u llogarit bazuar në madhësinë dhe llojin e ndërveprimit.

KUFIZIME
--------
- Ky është një simulim i thjeshtësuar, jo një analizë e plotë molekulare
- Rezultatet duhet të interpretohen si indikative, jo definitive
- Për analiza të detajuara, përdorni software të specializuar si AutoDock ose HADDOCK

REFERENCAT
----------
- UniProt Database: https://www.uniprot.org/
- AlphaFold Database: https://alphafold.ebi.ac.uk/
- 3Dmol.js Visualization: https://3dmol.org/

============================================
Raporti u gjenerua automatikisht nga Protein Interaction Visualizer
    `;
}

// ========================================
// HELP SYSTEM
// ========================================

/**
 * Tregon modalin e ndihmës
 */
function showHelp() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        showModal(modal);
    } else {
        // Krijon modal të ndihmës nëse nuk ekziston
        createHelpModal();
    }
}

/**
 * Krijon modal të ndihmës dinamikisht
 */
function createHelpModal() {
    const helpModal = document.createElement('div');
    helpModal.id = 'helpModal';
    helpModal.className = 'modal';
    helpModal.innerHTML = `
        <div class="modal-overlay" onclick="closeHelpModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">
                    <span class="modal-icon">❓</span>
                    Ndihmë për Përdorimin
                </h2>
                <button type="button" class="close-button" onclick="closeHelpModal()">
                    <span>&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="help-content">
                    <div class="help-section">
                        <h3>🚀 Si të Filloj</h3>
                        <ol>
                            <li>Shkruani emrin e proteinës së parë (p.sh. "insulin")</li>
                            <li>Klikoni "Ngarko Proteinën" për ta vizualizuar</li>
                            <li>Përsëriteni për proteinën e dytë</li>
                            <li>Klikoni "Simuloj Bashkimin" për të parë ndërveprimin</li>
                        </ol>
                    </div>
                    
                    <div class="help-section">
                        <h3>🔍 Shembuj Proteinash</h3>
                        <ul>
                            <li><strong>insulin</strong> - Hormoni i sheqerit</li>
                            <li><strong>hemoglobin</strong> - Proteina e gjakut</li>
                            <li><strong>lysozyme</strong> - Enzimë antibakteriale</li>
                            <li><strong>albumin</strong> - Proteina kryesore e serumit</li>
                            <li><strong>collagen</strong> - Proteina strukturore</li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h3>🎮 Kontrollet</h3>
                        <ul>
                            <li><strong>Klik dhe tërheq</strong> - Rrotullo strukturën</li>
                            <li><strong>Scroll</strong> - Zoom in/out</li>
                            <li><strong>Klik i djathtë</strong> - Zhvendos strukturën</li>
                            <li><strong>Butonët</strong> - Rivendos, screenshot, fullscreen</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(helpModal);
    showModal(helpModal);
}

/**
 * Tregon modalin "Rreth Aplikacionit"
 */
function showAbout() {
    showToast('Protein Interaction Visualizer v1.0 - Aplikacion për simulimin e ndërveprimit të proteinave', 'info');
}

/**
 * Mbyll modalin e ndihmës
 */
function closeHelpModal() {
    const modal = document.getElementById('helpModal');
    closeModalGeneric(modal);
}

// ========================================
// TOOLTIP SYSTEM
// ========================================

let currentTooltip = null;

/**
 * Tregon tooltip
 */
function showTooltip(event) {
    const element = event.target;
    const title = element.getAttribute('title');
    
    if (!title) return;
    
    // Krijon tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = title;
    tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 10000;
        pointer-events: none;
        white-space: nowrap;
    `;
    
    document.body.appendChild(tooltip);
    
    // Pozicionon tooltip
    const updatePosition = (e) => {
        tooltip.style.left = (e.clientX + 10) + 'px';
        tooltip.style.top = (e.clientY - 30) + 'px';
    };
    
    updatePosition(event);
    element.addEventListener('mousemove', updatePosition);
    
    currentTooltip = { element: tooltip, updatePosition };
    
    // Hiq title attribute për të shmangur tooltip default
    element.setAttribute('data-original-title', title);
    element.removeAttribute('title');
}

/**
 * Fshin tooltip
 */
function hideTooltip(event) {
    const element = event.target;
    
    if (currentTooltip) {
        currentTooltip.element.remove();
        element.removeEventListener('mousemove', currentTooltip.updatePosition);
        currentTooltip = null;
    }
    
    // Rikthe title attribute
    const originalTitle = element.getAttribute('data-original-title');
    if (originalTitle) {
        element.setAttribute('title', originalTitle);
        element.removeAttribute('data-original-title');
    }
}

// ========================================
// ERROR HANDLING
// ========================================

/**
 * Trajton gabimet globale
 */
window.addEventListener('error', function(event) {
    console.error('❌ Gabim global:', event.error);
    showToast('Ka ndodhur një gabim i papritur', 'error');
});

/**
 * Trajton promise rejections
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Promise rejection:', event.reason);
    showToast('Ka ndodhur një gabim në procesim', 'error');
    event.preventDefault();
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Debounce function për performance
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function për events
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Kopjon tekst në clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('U kopjua në clipboard', 'success');
    } catch (error) {
        console.error('Gabim në kopjim:', error);
        showToast('Gabim në kopjim', 'error');
    }
}

/**
 * Formatimi i numrave
 */
function formatNumber(num, decimals = 2) {
    if (typeof num !== 'number') return 'N/A';
    return num.toFixed(decimals);
}

/**
 * Formatimi i kohës
 */
function formatTime(date) {
    return new Intl.DateTimeFormat('sq-AL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

/**
 * Kontrollon nëse është mobile device
 */
function isMobile() {
    return window.innerWidth <= 768;
}

/**
 * Kontrollon nëse ka support për WebGL
 */
function hasWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
                 canvas.getContext('webgl'));
    } catch (e) {
        return false;
    }
}

// ========================================
// PERFORMANCE MONITORING
// ========================================

/**
 * Monitoron performancën e aplikacionit
 */
function monitorPerformance() {
    // Memory usage
    if (performance.memory) {
        const memory = performance.memory;
        console.log('Memory Usage:', {
            used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
            total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
            limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB'
        });
    }
    
    // Navigation timing
    if (performance.navigation) {
        console.log('Page Load Time:', performance.now() + ' ms');
    }
}

// ========================================
// LOCAL STORAGE MANAGEMENT
// ========================================

/**
 * Ruaj të dhëna në localStorage
 */
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Gabim në ruajtjen në localStorage:', error);
    }
}

/**
 * Ngarko të dhëna nga localStorage
 */
function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Gabim në ngarkimin nga localStorage:', error);
        return null;
    }
}

/**
 * Pastro localStorage
 */
function clearLocalStorage() {
    try {
        localStorage.clear();
        showToast('Cache u pastrua', 'info');
    } catch (error) {
        console.error('Gabim në pastrimin e localStorage:', error);
    }
}

// ========================================
// ANALYTICS (Optional)
// ========================================

/**
 * Track user events për analytics
 */
function trackEvent(category, action, label = '') {
    // Implemento Google Analytics ose analytics të tjera
    console.log('Analytics Event:', { category, action, label });
    
    // Shembull për Google Analytics:
    // if (typeof gtag !== 'undefined') {
    //     gtag('event', action, {
    //         event_category: category,
    //         event_label: label
    //     });
    // }
}

// ========================================
// INITIALIZATION CHECKS
// ========================================

/**
 * Kontrollon nëse të gjitha dependencat janë ngarkuar
 */
function checkDependencies() {
    const checks = [
        { name: '3Dmol.js', check: () => typeof window.$3Dmol !== 'undefined' },
        { name: 'Fetch API', check: () => typeof fetch !== 'undefined' },
        { name: 'WebGL', check: hasWebGLSupport }
    ];
    
    checks.forEach(({ name, check }) => {
        if (check()) {
            console.log(`✅ ${name} është i disponueshëm`);
        } else {
            console.error(`❌ ${name} nuk është i disponueshëm`);
            showToast(`${name} nuk është i mbështetur nga browseri juaj`, 'error');
        }
    });
}

// ========================================
// SERVICE WORKER (Optional)
// ========================================

/**
 * Regjistron service worker për offline support
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker u regjistrua:', registration);
            })
            .catch(error => {
                console.log('❌ Service Worker dështoi:', error);
            });
    }
}

// ========================================
// ADVANCED FEATURES
// ========================================

/**
 * Automatike cache cleanup
 */
function cleanupCache() {
    if (cache.size > 10) { // Mbaj maksimum 10 proteina në cache
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
    }
}

/**
 * Eksporton gjendjen e aplikacionit
 */
function exportAppState() {
    const state = {
        proteinFiles,
        proteinData,
        appState,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: 'application/json'
    });
    
    const link = document.createElement('a');
    link.download = `app_state_${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    
    showToast('Gjendja e aplikacionit u eksportua', 'success');
}

/**
 * Importon gjendjen e aplikacionit
 */
function importAppState(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const state = JSON.parse(e.target.result);
            
            // Rikthe gjendjen
            proteinFiles = state.proteinFiles || {};
            proteinData = state.proteinData || {};
            Object.assign(appState, state.appState || {});
            
            // Përditëso UI
            updateDockingButton();
            showToast('Gjendja e aplikacionit u importua', 'success');
            
        } catch (error) {
            console.error('Gabim në importimin e gjendjes:', error);
            showToast('Gabim në importimin e gjendjes', 'error');
        }
    };
    reader.readAsText(file);
}

// ========================================
// KEYBOARD SHORTCUTS ADVANCED
// ========================================

/**
 * Regjistron shortcuts të avancuara
 */
function setupAdvancedShortcuts() {
    // Ctrl+S për save state
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            exportAppState();
        }
        
        // Ctrl+H për help
        if (event.ctrlKey && event.key === 'h') {
            event.preventDefault();
            showHelp();
        }
        
        // Ctrl+D për docking (nëse mundur)
        if (event.ctrlKey && event.key === 'd') {
            event.preventDefault();
            if (appState.proteinsLoaded >= 2) {
                combineProteins();
            }
        }
    });
}

// ========================================
// FINAL SETUP
// ========================================

/**
 * Setup i plotë i aplikacionit
 */
function finalSetup() {
    // Regjistro shortcuts të avancuara
    setupAdvancedShortcuts();
    
    // Pastro cache-in periodikisht
    setInterval(cleanupCache, 300000); // Çdo 5 minuta
    
    // Monitorim performancë (vetëm në development)
    if (window.location.hostname === 'localhost') {
        setTimeout(monitorPerformance, 3000);
    }
    
    // Track page load
    trackEvent('page', 'load', 'protein_visualizer');
    
    // Setup error handlers
    setupErrorHandlers();
    
    console.log('🎉 Setup i plotë u përfundua!');
}

/**
 * Setup për error handlers
 */
function setupErrorHandlers() {
    // Network errors
    window.addEventListener('offline', () => {
        showToast('Lidhja me internetin u ndërpre', 'warning');
    });
    
    window.addEventListener('online', () => {
        showToast('Lidhja me internetin u rivendos', 'success');
    });
    
    // Fullscreen events
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            showToast('Fullscreen u aktivizua', 'info');
        } else {
            showToast('Fullscreen u mbyll', 'info');
        }
    });
}

// ========================================
// AUTO-INITIALIZATION
// ========================================

// Kryen setup-in final pas 1 sekonde
setTimeout(finalSetup, 1000);

// ========================================
// EXPORT FOR TESTING (Development only)
// ========================================

// Eksporto funksione për testing në development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.ProteinVisualizer = {
        // Core functions
        loadProtein,
        combineProteins,
        resetViewer,
        showToast,
        
        // Data
        cache,
        appState,
        proteinFiles,
        proteinData,
        
        // Utilities
        exportAppState,
        importAppState,
        monitorPerformance,
        checkDependencies,
        
        // Modal functions
        showProteinModal,
        showDockingAnalysis,
        closeAllModals
    };
    
    console.log('🔧 Development mode: ProteinVisualizer object është i disponueshëm në window');
}