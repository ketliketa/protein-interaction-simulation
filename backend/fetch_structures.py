# -*- coding: utf-8 -*-
"""
Moduli për marrjen e strukturave të proteinave nga UniProt dhe AlphaFold
Përmban funksione për kërkimin, shkarkimin dhe analizimin e strukturave PDB
"""

import requests
import urllib.parse
import os
import time

def get_protein_structure_and_info(protein_name):
    """
    Merr strukturën dhe informacionet e proteinës nga UniProt dhe AlphaFold
    
    Argumentet:
        protein_name (str): Emri i proteinës për t'u kërkuar
        
    Kthen:
        dict: Fjalor me file_path, pdb_text dhe info
        
    Hedh përjashtim:
        Exception: Nëse ka gabim në marrjen e të dhënave
    """
    try:
        # Pastroj dhe kodon emrin e proteinës për URL
        encoded_name = urllib.parse.quote(protein_name.strip())
        
        # URL për kërkimin në UniProt
        search_url = (
            f"https://rest.uniprot.org/uniprotkb/search?"
            f"query={encoded_name}&"
            f"fields=accession,protein_name,organism_name,cc_function,length&"
            f"format=json&size=1"
        )
        
        print(f"🔍 Duke kërkuar proteinën '{protein_name}' në UniProt...")
        
        # Bën kërkimin në UniProt
        response = requests.get(search_url, timeout=30)
        
        if not response.ok:
            raise Exception(
                f"Gabim në kërkimin në UniProt (status: {response.status_code}). "
                f"Kontrolloni lidhjen me internet."
            )
        
        # Analizon përgjigjen JSON
        data = response.json()
        results = data.get("results", [])
        
        if not results:
            raise Exception(
                f"Proteina '{protein_name}' nuk u gjet në UniProt. "
                f"Provoni me një emër tjetër (p.sh. 'insulin', 'hemoglobin')."
            )
        
        # Merr UniProt ID-në e parë
        first_result = results[0]
        uniprot_id = first_result["primaryAccession"]
        
        print(f"✅ U gjet UniProt ID: {uniprot_id}")
        
        # Shkarkon strukturën nga AlphaFold
        pdb_data = download_alphafold_structure(uniprot_id)
        
        # Ruan strukturën në disk
        file_path = save_pdb_structure(uniprot_id, pdb_data)
        
        # Merr informacione të detajuara për proteinën
        protein_info = get_detailed_protein_info(uniprot_id, pdb_data)
        
        print(f"🎉 Proteina '{protein_name}' u ngarkua me sukses!")
        
        return {
            "file_path": file_path,
            "pdb_text": pdb_data,
            "info": protein_info
        }
        
    except requests.exceptions.Timeout:
        raise Exception(
            "Koha e pritjes për përgjigje skadoi. "
            "Kontrolloni lidhjen me internet dhe provoni përsëri."
        )
    except requests.exceptions.ConnectionError:
        raise Exception(
            "Nuk u arrit të lidhet me serverin. "
            "Kontrolloni lidhjen tuaj me internet."
        )
    except Exception as e:
        # Kalon gabimin më lart nëse është një Exception i njohur
        if "nuk u gjet" in str(e) or "Gabim në" in str(e):
            raise e
        else:
            raise Exception(f"Gabim i papritur në marrjen e strukturës: {str(e)}")

def download_alphafold_structure(uniprot_id):
    """
    Shkarkon strukturën PDB nga AlphaFold
    
    Argumentet:
        uniprot_id (str): ID e UniProt-it
        
    Kthen:
        str: Përmbajtja e skedarit PDB
        
    Hedh përjashtim:
        Exception: Nëse struktura nuk ekziston ose ka gabim
    """
    # URL e AlphaFold për strukturën
    alphafold_url = f"https://alphafold.ebi.ac.uk/files/AF-{uniprot_id}-F1-model_v4.pdb"
    
    print(f"📥 Duke shkarkuar strukturën nga AlphaFold...")
    
    try:
        # Shkarkon skedarin PDB
        pdb_response = requests.get(alphafold_url, timeout=60)
        
        if not pdb_response.ok:
            if pdb_response.status_code == 404:
                raise Exception(
                    f"Struktura për UniProt ID '{uniprot_id}' nuk ekziston në AlphaFold. "
                    f"Kjo proteinë mund të mos ketë strukturë të parashikuar."
                )
            else:
                raise Exception(
                    f"Gabim në shkarkimin e strukturës (status: {pdb_response.status_code})"
                )
        
        pdb_content = pdb_response.text
        
        # Kontrollon nëse skedari PDB është i vlefshëm
        if not pdb_content.strip():
            raise Exception("Skedari PDB që u shkarkua është bosh")
            
        if "ATOM" not in pdb_content and "HETATM" not in pdb_content:
            raise Exception("Skedari PDB nuk përmban të dhëna të vlefshme atomike")
        
        print(f"✅ Struktura u shkarkua me sukses ({len(pdb_content)} karaktere)")
        
        return pdb_content
        
    except requests.exceptions.Timeout:
        raise Exception("Koha e shkarkimit të strukturës skadoi")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Gabim në shkarkimin e strukturës: {str(e)}")

def save_pdb_structure(uniprot_id, pdb_data):
    """
    Ruan strukturën PDB në disk
    
    Argumentet:
        uniprot_id (str): ID e UniProt-it
        pdb_data (str): Përmbajtja e strukturës PDB
        
    Kthen:
        str: Rruga deri te skedari i ruajtur
    """
    try:
        # Krijon dosjen models nëse nuk ekziston
        models_dir = "models"
        os.makedirs(models_dir, exist_ok=True)
        
        # Emri i skedarit
        filename = f"{uniprot_id}.pdb"
        file_path = os.path.join(models_dir, filename)
        
        # Ruan skedarin
        with open(file_path, "w", encoding='utf-8') as f:
            f.write(pdb_data)
        
        print(f"💾 Struktura u ruajt në: {file_path}")
        
        return file_path
        
    except OSError as e:
        raise Exception(f"Gabim në ruajtjen e skedarit: {str(e)}")

def get_detailed_protein_info(uniprot_id, pdb_data):
    """
    Merr informacione të detajuara për proteinën
    
    Argumentet:
        uniprot_id (str): ID e UniProt-it
        pdb_data (str): Përmbajtja e strukturës PDB
        
    Kthen:
        dict: Fjalor me informacionet e proteinës
    """
    try:
        # URL për informacione të detajuara nga UniProt
        info_url = f"https://rest.uniprot.org/uniprotkb/{uniprot_id}.json"
        
        print(f"📊 Duke marrë informacione të detajuara...")
        
        # Merr të dhënat nga UniProt
        info_response = requests.get(info_url, timeout=30)
        
        if not info_response.ok:
            print(f"⚠️ Nuk u morën informacione të detajuara (status: {info_response.status_code})")
            # Përdor të dhëna bazike nëse ka gabim
            return create_basic_protein_info(uniprot_id, pdb_data)
        
        uniprot_data = info_response.json()
        
        # Ekstrakton informacionet nga UniProt
        protein_info = extract_uniprot_info(uniprot_data)
        
        # Shton analizën e strukturës PDB
        pdb_analysis = analyze_pdb_structure(pdb_data)
        protein_info.update(pdb_analysis)
        
        # Shton UniProt ID
        protein_info["uniprot_id"] = uniprot_id
        
        return protein_info
        
    except Exception as e:
        print(f"⚠️ Gabim në marrjen e informacioneve: {str(e)}")
        # Kthen informacione bazike nëse ka gabim
        return create_basic_protein_info(uniprot_id, pdb_data)

def extract_uniprot_info(uniprot_data):
    """
    Ekstrakton informacionet kryesore nga të dhënat e UniProt
    
    Argumentet:
        uniprot_data (dict): Të dhënat JSON nga UniProt
        
    Kthen:
        dict: Informacionet e ekstraktuara
    """
    info = {}
    
    try:
        # Emri i proteinës
        protein_desc = uniprot_data.get("proteinDescription", {})
        if "recommendedName" in protein_desc:
            name_data = protein_desc["recommendedName"].get("fullName", {})
            info["name"] = name_data.get("value", "I panjohur")
        elif "submissionNames" in protein_desc and protein_desc["submissionNames"]:
            name_data = protein_desc["submissionNames"][0].get("fullName", {})
            info["name"] = name_data.get("value", "I panjohur")
        else:
            info["name"] = "I panjohur"
        
        # Organizmi
        organism_data = uniprot_data.get("organism", {})
        info["organism"] = organism_data.get("scientificName", "I panjohur")
        
        # Funksioni i proteinës
        function_text = ""
        comments = uniprot_data.get("comments", [])
        for comment in comments:
            if comment.get("commentType") == "FUNCTION":
                texts = comment.get("texts", [])
                if texts:
                    function_text = texts[0].get("value", "")
                    break
        
        info["function"] = function_text if function_text else "Funksioni nuk është i disponueshëm"
        
        # Gjatësia e sekuencës
        sequence_data = uniprot_data.get("sequence", {})
        info["length"] = sequence_data.get("length", 0)
        
    except Exception as e:
        print(f"⚠️ Gabim në ekstraktimin e informacioneve UniProt: {str(e)}")
        # Kthen të dhëna bazike nëse ka gabim
        info = {
            "name": "I panjohur",
            "organism": "I panjohur", 
            "function": "I panjohur",
            "length": 0
        }
    
    return info

def analyze_pdb_structure(pdb_data):
    """
    Analizon strukturën PDB dhe kthen statistika
    
    Argumentet:
        pdb_data (str): Përmbajtja e skedarit PDB
        
    Kthen:
        dict: Statistikat e strukturës
    """
    try:
        lines = pdb_data.splitlines()
        
        # Inicializon variablat
        amino_acids = set()
        atom_count = 0
        resolution = "N/A"
        chains = set()
        
        for line in lines:
            # Merr rezolucionin nga REMARK
            if line.startswith("REMARK   2 RESOLUTION"):
                try:
                    parts = line.split()
                    if len(parts) > 3 and parts[3] != "NOT":
                        resolution = f"{parts[3]} Å"
                except:
                    pass
            
            # Analizon atomet
            elif line.startswith("ATOM"):
                atom_count += 1
                
                # Merr aminoacidin (pozicioni 17-20)
                if len(line) >= 20:
                    aa = line[17:20].strip()
                    if aa:
                        amino_acids.add(aa)
                
                # Merr chain ID (pozicioni 21)
                if len(line) >= 22:
                    chain = line[21].strip()
                    if chain:
                        chains.add(chain)
        
        # Përcakton cilësinë bazuar në numrin e atomeve
        if atom_count > 5000:
            quality = "Shumë e lartë"
        elif atom_count > 2000:
            quality = "E lartë"
        elif atom_count > 1000:
            quality = "E mirë"
        elif atom_count > 500:
            quality = "E moderuar"
        else:
            quality = "Bazike"
        
        return {
            "amino_acids": sorted(list(amino_acids)),
            "atom_count": atom_count,
            "structure_quality": quality,
            "resolution": resolution,
            "chains": sorted(list(chains)),
            "chain_count": len(chains)
        }
        
    except Exception as e:
        print(f"⚠️ Gabim në analizën e strukturës PDB: {str(e)}")
        return {
            "amino_acids": [],
            "atom_count": 0,
            "structure_quality": "I panjohur",
            "resolution": "N/A",
            "chains": [],
            "chain_count": 0
        }

def create_basic_protein_info(uniprot_id, pdb_data):
    """
    Krijon informacione bazike kur ka gabim në marrjen e të dhënave
    
    Argumentet:
        uniprot_id (str): ID e UniProt-it
        pdb_data (str): Përmbajtja e strukturës PDB
        
    Kthen:
        dict: Informacionet bazike
    """
    pdb_analysis = analyze_pdb_structure(pdb_data)
    
    return {
        "uniprot_id": uniprot_id,
        "name": f"Proteina {uniprot_id}",
        "organism": "I panjohur",
        "function": "Informacionet nuk janë të disponueshme",
        "length": 0,
        **pdb_analysis
    }

# Funksion për testimin e modulit
def test_protein_fetch(protein_name):
    """
    Teston marrjen e strukturës së proteinës
    
    Argumentet:
        protein_name (str): Emri i proteinës për test
        
    Kthen:
        bool: True nëse testi kaloi, False nëse dështoi
    """
    try:
        print(f"\n🧪 Duke testuar proteinën: {protein_name}")
        print("=" * 50)
        
        result = get_protein_structure_and_info(protein_name)
        
        print(f"\n📋 Rezultatet për '{protein_name}':")
        print(f"📁 Rruga e skedarit: {result['file_path']}")
        print(f"🔬 UniProt ID: {result['info']['uniprot_id']}")
        print(f"📛 Emri: {result['info']['name']}")
        print(f"🦠 Organizmi: {result['info']['organism']}")
        print(f"📏 Gjatësia: {result['info']['length']} aminoacide")
        print(f"⚛️ Atomet: {result['info']['atom_count']}")
        print(f"⭐ Cilësia: {result['info']['structure_quality']}")
        print(f"🔍 Rezolucioni: {result['info']['resolution']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Gabim në testimin e '{protein_name}': {e}")
        return False

if __name__ == "__main__":
    # Teston modulin me disa proteina të njohura
    test_proteins = ["insulin", "hemoglobin", "lysozyme"]
    
    print("🧬 Duke testuar modulin fetch_structures.py...")
    print("=" * 60)
    
    success_count = 0
    total_count = len(test_proteins)
    
    for protein in test_proteins:
        if test_protein_fetch(protein):
            success_count += 1
            print("✅ Sukses!")
        else:
            print("❌ Dështoi!")
        print("-" * 50)
    
    print(f"\n📊 Rezultatet e testimit: {success_count}/{total_count} proteina u ngarkuan me sukses")
    
    if success_count == total_count:
        print("🎉 Të gjitha testet kaluan!")
    else:
        print("⚠️ Disa teste dështuan. Kontrolloni lidhjen me internet.")