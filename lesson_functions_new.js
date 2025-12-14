// ==================== NOUVELLES FONCTIONS PLANS DE LEÇON (AVEC CHECKBOXES) ====================

// Fonction pour peupler les checkboxes des classes
function populateLessonPlanClasses() {
    const container = document.getElementById('lessonPlanClassesList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!planData || planData.length === 0) {
        container.innerHTML = '<p style="color: #999;">Aucune donnée disponible</p>';
        updateGenerateButtonState();
        return;
    }
    
    const classKey = findHKey('Classe');
    if (!classKey) {
        container.innerHTML = '<p style="color: #999;">Erreur: colonne Classe non trouvée</p>';
        updateGenerateButtonState();
        return;
    }
    
    const uniqueClasses = [...new Set(planData.map(item => item[classKey]).filter(Boolean))];
    uniqueClasses.sort(compareClasses);
    
    if (uniqueClasses.length === 0) {
        container.innerHTML = '<p style="color: #999;">Aucune classe trouvée</p>';
        updateGenerateButtonState();
        return;
    }
    
    uniqueClasses.forEach(cls => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '8px';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `class_${cls}`;
        checkbox.value = cls;
        checkbox.classList.add('class-checkbox');
        checkbox.addEventListener('change', () => {
            updateLessonPlanSubjects();
            updateGenerateButtonState();
        });
        
        const label = document.createElement('label');
        label.htmlFor = `class_${cls}`;
        label.style.marginLeft = '5px';
        label.style.cursor = 'pointer';
        
        const arTranslation = classTranslations[cls];
        label.textContent = arTranslation ? `${arTranslation} (${cls})` : cls;
        
        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    });
    
    updateLessonPlanSubjects();
    updateGenerateButtonState();
}

// Fonction pour peupler les checkboxes des matières (basé sur les classes sélectionnées)
function updateLessonPlanSubjects() {
    const container = document.getElementById('lessonPlanSubjectsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Récupérer les classes sélectionnées
    const selectedClasses = Array.from(document.querySelectorAll('.class-checkbox:checked'))
        .map(cb => cb.value);
    
    if (selectedClasses.length === 0) {
        container.innerHTML = '<p style="color: #999;">Sélectionnez d\'abord une ou plusieurs classes</p>';
        updateGenerateButtonState();
        return;
    }
    
    if (!planData || planData.length === 0) {
        container.innerHTML = '<p style="color: #999;">Aucune donnée disponible</p>';
        updateGenerateButtonState();
        return;
    }
    
    const classKey = findHKey('Classe');
    const matiereKey = findHKey('Matière');
    
    if (!classKey || !matiereKey) {
        container.innerHTML = '<p style="color: #999;">Erreur de configuration</p>';
        updateGenerateButtonState();
        return;
    }
    
    // Mots-clés pour exclure les matières arabes
    const arabicKeywords = [
        'عربي', 'العربية', 'اللغة العربية', 'arabe',
        'قرآن', 'القرآن', 'coran',
        'تجويد', 'التجويد', 'tajwid',
        'حديث', 'الحديث', 'hadith',
        'تربية', 'التربية', 'islamique',
        'توحيد', 'التوحيد', 'tawhid',
        'فقه', 'الفقه', 'fiqh',
        'سيرة', 'السيرة', 'sirah'
    ];
    
    // Récupérer toutes les matières des classes sélectionnées
    const subjectsFromSelectedClasses = planData
        .filter(item => selectedClasses.includes(item[classKey]) && item[matiereKey])
        .map(item => item[matiereKey]);
    
    // Filtrer pour exclure les matières arabes
    const uniqueSubjects = [...new Set(subjectsFromSelectedClasses)]
        .filter(subject => {
            return !arabicKeywords.some(keyword => 
                subject.toLowerCase().includes(keyword.toLowerCase())
            );
        })
        .sort();
    
    if (uniqueSubjects.length === 0) {
        container.innerHTML = '<p style="color: #999;">Aucune matière non-arabe trouvée pour ces classes</p>';
        updateGenerateButtonState();
        return;
    }
    
    uniqueSubjects.forEach(subject => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '8px';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `subject_${subject}`;
        checkbox.value = subject;
        checkbox.classList.add('subject-checkbox');
        checkbox.addEventListener('change', updateGenerateButtonState);
        
        const label = document.createElement('label');
        label.htmlFor = `subject_${subject}`;
        label.style.marginLeft = '5px';
        label.style.cursor = 'pointer';
        label.textContent = subject;
        
        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    });
    
    updateGenerateButtonState();
}

// Fonction pour activer/désactiver le bouton de génération
function updateGenerateButtonState() {
    const btn = document.getElementById('generateAllLessonPlansBtn');
    const infoSpan = document.getElementById('lessonPlanSelectionInfo');
    
    if (!btn || !infoSpan) return;
    
    const selectedClasses = Array.from(document.querySelectorAll('.class-checkbox:checked'));
    const selectedSubjects = Array.from(document.querySelectorAll('.subject-checkbox:checked'));
    
    const classCount = selectedClasses.length;
    const subjectCount = selectedSubjects.length;
    
    if (classCount > 0 && subjectCount > 0) {
        btn.disabled = false;
        infoSpan.textContent = `${classCount} classe(s) et ${subjectCount} matière(s) sélectionnées`;
        infoSpan.style.color = '#28a745';
    } else {
        btn.disabled = true;
        if (classCount === 0) {
            infoSpan.textContent = 'Sélectionnez au moins une classe';
        } else {
            infoSpan.textContent = 'Sélectionnez au moins une matière';
        }
        infoSpan.style.color = '#999';
    }
}

// Fonctions pour sélectionner/déselectionner toutes les classes
function selectAllClasses() {
    document.querySelectorAll('.class-checkbox').forEach(cb => {
        cb.checked = true;
    });
    updateLessonPlanSubjects();
    updateGenerateButtonState();
}

function deselectAllClasses() {
    document.querySelectorAll('.class-checkbox').forEach(cb => {
        cb.checked = false;
    });
    updateLessonPlanSubjects();
    updateGenerateButtonState();
}

// Fonctions pour sélectionner/déselectionner toutes les matières
function selectAllSubjects() {
    document.querySelectorAll('.subject-checkbox').forEach(cb => {
        cb.checked = true;
    });
    updateGenerateButtonState();
}

function deselectAllSubjects() {
    document.querySelectorAll('.subject-checkbox').forEach(cb => {
        cb.checked = false;
    });
    updateGenerateButtonState();
}

// Fonction principale: Générer tous les plans de leçon sélectionnés
async function startGenerateAllLessonPlans() {
    if (!currentWeek) {
        displayAlert("Veuillez d'abord sélectionner une semaine.", true);
        return;
    }
    
    if (!planData || planData.length === 0) {
        displayAlert("Aucune donnée disponible pour cette semaine.", true);
        return;
    }
    
    // Récupérer les classes et matières sélectionnées
    const selectedClasses = Array.from(document.querySelectorAll('.class-checkbox:checked'))
        .map(cb => cb.value);
    const selectedSubjects = Array.from(document.querySelectorAll('.subject-checkbox:checked'))
        .map(cb => cb.value);
    
    if (selectedClasses.length === 0 || selectedSubjects.length === 0) {
        displayAlert("Veuillez sélectionner au moins une classe et une matière.", true);
        return;
    }
    
    // Confirmation
    const confirmation = confirm(
        `Générer les plans de leçon pour :\n\n` +
        `Classes: ${selectedClasses.join(', ')}\n` +
        `Matières: ${selectedSubjects.join(', ')}\n` +
        `Semaine: ${currentWeek}\n\n` +
        `Cela générera des plans pour toutes les combinaisons classe/matière.\n\n` +
        `Continuer ?`
    );
    
    if (!confirmation) return;
    
    // Génération
    await generateMultipleLessonPlans(selectedClasses, selectedSubjects);
}

// Générer les plans pour toutes les combinaisons classe/matière sélectionnées
async function generateMultipleLessonPlans(selectedClasses, selectedSubjects) {
    const classKey = findHKey('Classe');
    const matiereKey = findHKey('Matière');
    
    // Filtrer les lignes correspondantes
    const rowsToGenerate = planData.filter(item => 
        selectedClasses.includes(item[classKey]) && selectedSubjects.includes(item[matiereKey])
    );
    
    if (rowsToGenerate.length === 0) {
        displayAlert("Aucune ligne trouvée pour ces combinaisons classe/matière.", true);
        return;
    }
    
    console.log(`${rowsToGenerate.length} ligne(s) à traiter`);
    
    displayAlert(`Génération de ${rowsToGenerate.length} plan(s) de leçon...`, false);
    setButtonLoading('generateAllLessonPlansBtn', true, 'fas fa-robot');
    showProgressBar();
    
    let successCount = 0;
    let errorCount = 0;
    
    try {
        for (let i = 0; i < rowsToGenerate.length; i++) {
            const rowData = rowsToGenerate[i];
            const progress = Math.round(((i + 1) / rowsToGenerate.length) * 95);
            updateProgressBar(progress);
            
            try {
                // Générer le plan avec l'IA
                const response = await fetch('/api/generate-ai-lesson-plan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ week: currentWeek, rowData: rowData })
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const contentDisposition = response.headers.get('content-disposition');
                    let filename = `plan_lecon_${rowData[classKey]}_${rowData[matiereKey]}_${i + 1}.docx`;
                    if (contentDisposition) {
                        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?(;|$)/i);
                        if (filenameMatch && filenameMatch[1]) {
                            filename = filenameMatch[1];
                        }
                    }
                    
                    // Convertir en base64 pour MongoDB
                    const fileBuffer = await blob.arrayBuffer();
                    const base64Buffer = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
                    
                    // Sauvegarder dans MongoDB
                    const saveResponse = await fetch('/api/save-lesson-plan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            week: currentWeek, 
                            rowData: rowData,
                            fileBuffer: base64Buffer,
                            filename: filename
                        })
                    });
                    
                    if (saveResponse.ok) {
                        successCount++;
                        console.log(`✅ Plan ${i + 1}/${rowsToGenerate.length} sauvegardé`);
                    } else {
                        console.error('Erreur sauvegarde MongoDB:', await saveResponse.text());
                        errorCount++;
                    }
                } else {
                    const errorResult = await response.json().catch(() => ({ message: "Erreur inconnue" }));
                    console.error(`Erreur génération ${i + 1}:`, errorResult.message);
                    errorCount++;
                }
            } catch (error) {
                console.error(`Erreur ligne ${i + 1}:`, error);
                errorCount++;
            }
            
            // Petit délai entre chaque génération
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        updateProgressBar(100);
        
        if (errorCount === 0) {
            displayAlert(`✅ ${successCount} plan(s) de leçon généré(s) et sauvegardé(s) avec succès !`, false);
        } else {
            displayAlert(`⚠️ ${successCount} réussis, ${errorCount} échoués`, false);
        }
        
        // Recharger les données pour afficher les boutons de téléchargement
        await loadPlanForWeek();
        
    } catch (error) {
        console.error("Erreur génération plans:", error);
        displayAlert('Erreur lors de la génération des plans de leçon.', true);
        updateProgressBar(0);
    } finally {
        hideProgressBar();
        setButtonLoading('generateAllLessonPlansBtn', false, 'fas fa-robot');
    }
}
