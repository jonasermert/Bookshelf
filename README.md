# Bookshelf

Buchverwaltung mit **React, TypeScript und Tailwind CSS** sowie dem bestehenden **Spring-Boot-/JPA-/Liquibase-Backend**. Die frühere Thymeleaf-Tabelle wird durch ein responsives Bücherregal mit eigener Anmeldung ersetzt.

## Funktionen

- Bestehende Konten für Anmeldung und Abmeldung verwenden.
- Bücher nach Titel, Autor, ISBN und Beschreibung durchsuchen.
- Nach Titel, Autor oder zuletzt hinzugefügt sortieren.
- Bücher anlegen, bearbeiten und nach Bestätigung löschen.
- Feldfehler, Verbindungsprobleme und abgelaufene Sitzungen verständlich anzeigen.
- Tastaturbedienbare Dialoge und responsive Darstellung.

Das Bücherregal bleibt wie bisher ein gemeinsamer Katalog für angemeldete Benutzer. Es gibt keine Registrierung und keine getrennten Sammlungen pro Konto. Die Coverdarstellung wird aus den Buchdaten gestaltet; externe Coverdienste werden nicht benötigt.

## Voraussetzungen

- Java 17.
- Node.js ab 22.12 und npm.
- Für die voreingestellte H2-Datenbank sind weder Docker noch ein separater Datenbankserver nötig.

Das vorhandene Spring-Boot-2.7-Backend bleibt erhalten. Eine Migration auf eine neue Spring-Hauptversion ist nicht Teil der Frontendumstellung.

## Unter Windows starten

Im Projektverzeichnis ein Terminal für Spring öffnen:

```powershell
.\mvnw.cmd spring-boot:run
```

In einem zweiten Terminal das Frontend starten:

```powershell
cd frontend
npm ci
npm run dev
```

**http://localhost:5173** öffnen. Vite leitet `/book` und `/api` an **http://127.0.0.1:8080** weiter.

Für eine neue lokale Datenbank legt der vorhandene Liquibase-Changelog das Workshop-Konto **dbUser** mit dem Passwort **workshops** und drei Beispielbücher an. Bei einer bestehenden Datenbank gelten deren Benutzer und Passwörter. Das Workshop-Konto ist für die lokale Entwicklungsumgebung vorgesehen.

In IntelliJ die `BookshelfApplication` mit JDK 17 starten; für React ein Terminal im Ordner `frontend` verwenden. Unter macOS/Linux lautet der Backend-Befehl `bash mvnw spring-boot:run`.

## Datenbank und Neustarts

Standardmäßig liegt die H2-Datenbank weiterhin als `testdb.mv.db` im Arbeitsverzeichnis des Backends. Die bisherige Einstellung `spring.liquibase.drop-first=true` ist entfernt: Liquibase löscht die Daten beim Start nicht mehr. Vorhandene Changelogs bleiben unverändert, damit ihre Prüfsummen gültig bleiben.

Optionale Umgebungsvariablen:

| Variable | Bedeutung |
| --- | --- |
| `DB_URL` | JDBC-URL; Standard: `jdbc:h2:file:./testdb;DB_CLOSE_ON_EXIT=FALSE` |
| `DB_PASSWORD` | H2-Passwort; für die lokale Workshop-Datenbank standardmäßig `password` |
| `SERVER_PORT` | Spring-Port; standardmäßig 8080 |

Eine bereits vorhandene H2-Datei vor der Umstellung sichern und Spring weiterhin mit demselben Arbeitsverzeichnis starten. Änderungen an `DB_PASSWORD` ändern nicht automatisch das Passwort einer bereits angelegten H2-Datenbank. Das bisherige `prod`-Profil verwendet Port 8090; bei einem abweichenden Port den Proxy in `frontend/vite.config.ts` anpassen.

Die Tests verwenden eine eigene H2-Datenbank im Speicher. Die H2-Webkonsole ist standardmäßig deaktiviert.

## Gemeinsamer Produktionsbuild

```powershell
cd frontend
npm ci
npm run build
cd ..
.\mvnw.cmd clean package
java -jar target/bookshelf-0.0.1-SNAPSHOT.jar
```

Anschließend **http://localhost:8080** öffnen. Maven übernimmt den zuvor erzeugten Ordner `frontend/dist` in die statischen Ressourcen des JAR. Oberfläche und API verwenden denselben Ursprung. Nach Frontendänderungen zuerst erneut `npm run build` ausführen.

## Anmeldung und API

Die React-Anmeldung sendet Formularfelder an `POST /api/login`. Spring verwaltet die Sitzung über sein Sitzungscookie; Passwörter und Sitzungstoken werden nicht im Browser-Speicher abgelegt.

| Methode | Pfad | Bedeutung |
| --- | --- | --- |
| GET | `/api/session` | Anmeldestatus und Benutzername |
| GET | `/api/csrf` | CSRF-Token und Name des zugehörigen Headers |
| POST | `/api/login` | Anmeldung mit `username` und `password`, 204 oder 401 |
| POST | `/api/logout` | Abmeldung, 204 |
| GET | `/book` | Alle Bücher |
| GET | `/book/{isbn}` | Einzelnes Buch oder 404 |
| GET | `/book?author=…` | Erster passender Autorentreffer wie bisher |
| POST | `/book/search` | Bestehende kombinierte Suche nach Autor und ISBN |
| POST | `/book` | Buch anlegen, 201 mit Location-Header |
| PUT | `/book/{isbn}` | Buch bearbeiten, auch die ISBN kann geändert werden |
| DELETE | `/book/{isbn}` | Buch löschen, 204 oder 404 |

Die Buch-API benötigt eine Anmeldung. HTTP Basic bleibt für bestehende API-Clients verfügbar. **CSRF-Schutz ist jetzt aktiv:** Für schreibende Aufrufe inklusive Login und Logout zuerst `GET /api/csrf` aufrufen, das Cookie beibehalten und den gelieferten Token im angegebenen Header mitsenden. Das Frontend erledigt dies automatisch und holt vor jedem Schreibzugriff einen aktuellen Token.

POST/PUT erwarten:

```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "isbn": "978-3826655487",
  "description": "Lesbaren und wartbaren Code schreiben."
}
```

Titel und Autor sind Pflichtfelder mit maximal 255 Zeichen. Die ISBN wird mit einer einfachen Formatprüfung validiert: 10–32 Zeichen aus Ziffern, X, Bindestrichen und Leerzeichen; eine Prüfziffernberechnung erfolgt nicht. Die Beschreibung ist optional und auf 1000 Zeichen begrenzt. Bestehende ISBNs werden mit HTTP 409 abgewiesen. HTTP 400 enthält feldbezogene Meldungen. Eine beim Anlegen mitgesendete ID wird ignoriert, damit vorhandene Bücher nicht überschrieben werden.

## Prüfen

```powershell
cd frontend
npm test
npm run build
npm audit
cd ..
.\mvnw.cmd verify
node scripts/smoke.mjs
```

Der letzte Befehl benötigt das zuvor gemeinsam gebaute JAR und einen freien Port 18080. Er legt eine separate H2-Datei unter `target/smoke-db.mv.db` an, prüft die React-Auslieferung, echte Anmeldung, Buch-CRUD und Abmeldung sowie den Datenerhalt nach einem Neustart. Nach einem abgebrochenen Testlauf die Prüfdatenbank bei gestopptem Testserver entfernen, bevor der Test erneut gestartet wird.

GitHub Actions führt aus:

- Vitest-/Testing-Library-Tests für Oberfläche, Suche, HTTP-Anbindung und Sitzungen.
- TypeScript-Prüfung, Vite-/Tailwind-Build und npm-Audit.
- Spring-Tests einschließlich bestehender Repository- und Mockito-Tests.
- HTTP-Gesamttest mit dem gebauten JAR und Neustart der persistenten H2-Datenbank.

## Projektstruktur

- `frontend/src/components`: Anmeldung, Buchkarten, Formular und Dialog.
- `frontend/src/api.ts`: Sitzungen, CSRF und HTTP-Zugriffe.
- `frontend/src/collection.ts`: Suche und Sortierung.
- `src/main/java/de/workshops/bookshelf`: Bestehendes Spring-Backend mit Controllern, Service und JPA-Modell.
- `src/main/resources/db/changelog`: Unveränderte Liquibase-Basismigrationen.
- `scripts/smoke.mjs`: HTTP-Prüfung der Gesamtanwendung.

Ursprung: Workshops.de Spring Intensiv, 1.–8. Dezember 2021. Lizenz: MIT.
