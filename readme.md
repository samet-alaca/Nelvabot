# Nelvabot

## Usage

### Stats
```javascript
/stats
```
#### Période (obligatoire)
- -d : Aujourd'hui
- -y : Hier
- -s : 7 derniers jours
- -m : 31 derniers jours
- -t : Tout

#### Options (facultatives)
- -chart : Affiche les données sous forme graphique (incompatible avec -d et -y et -list)
- -list : Liste les données pour chaque utilisateur
- -c : Relève le nombre de caractères à la place du nombre de message

#### Il est possible de mentionner des utilisateurs ou des rôles
```javascript
/stats @role -s -chart
/stats @utilisateur -d
```

### Notify
```javascript
/notify
```
#### Message (obligatoire)
- -message= : Spécifie le message à envoyer (à toujours mettre à la fin)

#### Exemples
```javascript
/notify -message=Bonjour ceci est un message qui va être reçu par tout le monde
/notify @role -message=Ceci ne sera reçu que par les utilisateurs qui sont dans @role
```

### Rank
```javascript
/rank
```

#### Obtenir le rang d'un joueur
- @mention : mention du joueur (requis)
- -get : requis

#### Changer le rang d'un joueur (gouvernement)
- m= : Rang militaire
- e= : Rang economique
- d= : Rang diplomatique
- l= : Rang Leadership
- i= : Rang implication
- -setdefault : Remet les rangs à defaut (55555)

#### Changer le ruban
- -ruban= : (1) Militaire - (2) Economique - (3) Diplomatique - (4) Leadership

#### Exemples
```javascript
/rank @Samet -setdefault
/rank @Samet m=2 e=3 d=1 l=4 i=1
/rank @Samet -get
/rank @Samet -ruban=3
```

### Bestiaire
```javascript
/bestiaire
```
#### Ajouter un message
- -pseudo= : pseudo du joueur (requis)
- -message= : message (requis)

#### Supprimer un message
- -delete= : ID du message (requis)

#### Exemples
```javascript
/bestiaire -pseudo=Samet -message=Test
/bestiaire -delete=23
/bestiaire -find=Samet
/bestiaire -find=*
```
#### Trouver tous les messages pour un joueur
- -find= : pseudo du joueur ou * pour tous les joueurs (requis)