# 🚀 Auto-Network Configuration

## Probleme Résolue

Au lieu de modifier manuellement les fichiers `.env` à chaque changement de réseau, **les scripts détectent automatiquement ton IP** !

---

## 🎯 Comment Utiliser

### Première utilisation
```bash
setup-network.bat
launch-app.bat
```

### Changement de réseau (Wi-Fi, etc.)
```bash
setup-network.bat    # Relancer la détection d'IP
launch-app.bat       # Redémarrer les services
```

---

## 📝 Ce que font les scripts

### `setup-network.bat`
✅ Détecte ton IP locale (ex: 192.168.212.13)  
✅ Crée `backend/.env` avec `CORS_ORIGIN=http://YOUR_IP:8080`  
✅ Crée `frontend/.env` avec `VITE_API_URL=http://YOUR_IP:5000/api`  
✅ Vérifie PostgreSQL  

### `launch-app.bat`
✅ Lance le backend (port 5000)  
✅ Lance le frontend (port 8080)  
✅ Affiche les adresses d'accès  

---

## 📱 Accès à l'Application

### Sur le même ordinateur
```
http://localhost:8080
```

### Depuis un autre appareil (même réseau)
```
http://192.168.212.13:8080
```

---

## 🔥 Pare-feu Windows

Si le pare-feu bloque les ports, ajoute les règles (PowerShell Admin):
```powershell
New-NetFirewallRule -DisplayName "Backend Port 5000" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
New-NetFirewallRule -DisplayName "Frontend Port 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

---

## 📊 Résumé

| Avant | Après |
|-------|-------|
| ❌ Modifier .env manuellement | ✅ Auto-détection IP |
| ❌ Erreurs de typo (182 vs 212) | ✅ Zéro erreur |
| ❌ Problèmes CORS | ✅ CORS configuré automatiquement |
| ❌ Frontend ne trouve pas le backend | ✅ Tout connecté correctement |

---

## 💡 Avantages

- 🔍 **Auto-Détection** : L'IP est détectée automatiquement
- 🌐 **Multi-Réseau** : Change de Wi-Fi ? Relance le script !
- 📱 **Multi-Appareils** : Accède depuis ton mobile/desktop
- 🔧 **Zero Config** : Aucune configuration manuelle requise
- ⚡ **Une Commande** : `launch-app.bat` et c'est parti !

---

## 🎉 Résultat

✅ Backend répond sur `http://192.168.212.13:5000`  
✅ Frontend accessible sur `http://192.168.212.13:8080`  
✅ Frontend peut se connecter au backend  
✅ WebSocket synchronise en temps réel  
✅ Multi-postes fonctionnent correctement  

---

**Besoin d'aide ?** Consulte `QUICK_START_NETWORK.md` pour plus de détails !
