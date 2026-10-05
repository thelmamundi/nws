# Writing an evergreen post

An evergreen post explains an idea once. The **Sky Link** card on the page finds the nearest real sky event for the topic whenever someone opens it, so the post never needs updating.

1. Copy `src/pages/post-pluto.html` to `src/pages/post-<your-slug>.html` (names starting `post-` get the article header font and the Posts highlight).
2. Set the title, eyebrow and lead in the `{{hero ...}}` line. `art="glyph:mercury"` sets the spinning glyph in the header: use the planet or sign the post is about (`glyph:venus`, `glyph:scorpio`, `glyph:north_node` ...). Use `art="mercury"` for a spinning planet instead.
3. Set the topic on the Sky Link line: `{{widget name="skylink" title="Sky Link" ... opts="topic=love"}}`.
4. Write the article inside `.post-content`.
5. `node build.js`.

Topics (each maps to a planet): communication, contracts, technology, learning (Mercury) · love, money, beauty (Venus) · drive, energy (Mars) · luck, travel (Jupiter) · discipline, career (Saturn) · change (Uranus) · dreams (Neptune) · power (Pluto) · emotions, rhythm (Moon) · identity (Sun) · purpose (North Node). Or `opts="planet=venus"`.

What the card shows
- **NOW**: sign, degree, direct or retrograde, speed, dignity.
- **LAST / NEXT**: the nearest station, sign change, lunation (Moon) or exact aspect, with a countdown. The closest one is marked.
- **Link your own chart**: birth date, time and place (saved only in the browser) add a second card with the house it is moving through, where the last and next events land in your chart, and which of your planets it touches. Houses need a birth time.

To add a topic, edit `TOPICS` in `assets/js/widgets.js`.

Add the article to the archive rows in `src/pages/posts.html` (and the home tiles if you want it featured).
