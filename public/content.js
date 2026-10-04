/* Games in Time: words and catalogue.
   Edit this file to change what the site says. Each playable game also has a file in public/games/<id>.js.
   Research notes and sources for every entry are in docs/RESEARCH.md. */
window.GIT_CONTENT = {
  "site": {
    "name": "Games in Time",
    "tagline": "Play the games kids played a hundred years and more ago.",
    "lede": "Free games from the 1800s to the 1910s, digitised so you can play them today, with the true story of who played them back then. No accounts. No ads. Nothing to install.",
    "sister": {
      "name": "1973.ai",
      "url": "https://1973.ai"
    },
    "repo": "https://github.com/UPD8-group/gamesintime"
  },
  "eras": [
    {
      "id": "1800s",
      "years": "1800 to 1879",
      "name": "The Parlour",
      "intro": "Before electric light, families filled long evenings in the parlour with cards, puzzles and new optical toys, while kids outside played with marbles, hoops and knucklebones."
    },
    {
      "id": "1880s",
      "years": "1880 to 1889",
      "name": "The Craze Decade",
      "intro": "Cheap printing and railways meant a new game could sweep the world in months. The Fifteen Puzzle, Reversi, Halma and Tiddlywinks all arrived in one decade."
    },
    {
      "id": "1890s",
      "years": "1890 to 1899",
      "name": "The Penny Arcade",
      "intro": "Coin-operated machines, Ludo, Snakes and Ladders and the first written rules for Hangman. The word arcade comes from this decade."
    },
    {
      "id": "1900s",
      "years": "1900 to 1909",
      "name": "The New Century",
      "intro": "Federation in Australia, the diabolo craze, jigsaw mania, and a Harvard mathematician who solved a matchstick game called Nim."
    },
    {
      "id": "1910s",
      "years": "1910 to 1919",
      "name": "The Puzzle Page",
      "intro": "A newspaper printed the first crossword in 1913. Pencil-and-paper games travelled with soldiers and schoolkids alike."
    },
    {
      "id": "gap",
      "gap": true,
      "years": "1920 to 1969",
      "name": "Halls under construction",
      "intro": "Radio, Monopoly, Scrabble and the first computer games. These halls are next."
    },
    {
      "id": "1970s",
      "external": "https://1973.ai",
      "years": "1970 to 1979",
      "name": "Arcade cabinets",
      "intro": "Opens on our sister site, 1973.ai."
    },
    {
      "id": "1980s",
      "external": "https://1973.ai",
      "years": "1980 to 1989",
      "name": "Home consoles",
      "intro": "Opens on our sister site, 1973.ai."
    },
    {
      "id": "1990s",
      "external": "https://1973.ai",
      "years": "1990 to 1999",
      "name": "Home computers",
      "intro": "Opens on our sister site, 1973.ai."
    }
  ],
  "games": [
    {
      "id": "cup-and-ball",
      "title": "Cup and Ball (Bilboquet)",
      "era": "1800s",
      "year": 1580,
      "yearLabel": "c. 1580s France; a favourite toy all through the 1800s",
      "origin": "France (bilboquet), 16th century; a craze at the court of Henri III",
      "blurb": "Flick a wooden ball on a string into the air and catch it in the cup, or, if you are really good, on the spike.",
      "story": [
        "The French called it bilboquet, and King Henri III, who died in 1589, was so keen on it that he was often seen playing in public. Some people thought a king playing with a toy was a sign he was not quite right in the head. After Henri died the fad faded, but it roared back in the 1700s, when French nobles owned versions carved from ivory.",
        "The V&A in London has one of those: a turned ivory bilboquet made in Paris in 1779 and supplied by the royal office that organised the king's entertainments at Versailles. It has a thin ivory spike for experts, who had to catch the ball on a hole drilled in its underside, and probably once had a cup at the other end for beginners, now hidden in the wooden base it is mounted on. The philosopher Rousseau wrote that he would carry one in his pocket so he had an excuse not to talk.",
        "In England it was called bilbocatch. In October 1808 Jane Austen wrote to her sister from Southampton that her nephew George was \"indefatigable\" at it. Her nephew James Edward Austen-Leigh wrote in 1871 that Jane herself \"has been known to catch it on the point above a hundred times in succession, till her hand was weary\". Her family's carved ivory cup and ball was auctioned in London in 2016.",
        "Through the 1800s cheap wooden versions made it a toy for ordinary children too. The V&A holds an English turned-wood cup and ball from 1880 to 1900, painted with red rings, that belonged to a girl born in 1881. Japan's kendama, with three cups and a spike, may descend from the same French toy, though some say it reached Japan from China; it took its modern shape in 1919 in the city of Kure."
      ],
      "howToPlay": [
        "Hold the handle upright with the cup facing up and let the ball hang still on its string.",
        "Bend your knees, then straighten quickly so the ball rises straight up above the cup.",
        "Watch the ball and move the cup underneath it as it falls. Catch softly by dipping the cup as the ball lands.",
        "Count your catches in a row. Jane Austen managed more than a hundred.",
        "Expert level: if your toy has a spike and the ball has a hole, turn the handle over and try to catch the ball on the spike."
      ],
      "didYouKnow": [
        "King Henri III of France was often seen playing cup and ball in public in the 1580s.",
        "Jane Austen was said to catch the ball on the spike more than a hundred times in a row.",
        "Rousseau wrote he would carry a cup and ball so he could play all day instead of making small talk.",
        "A 1779 ivory bilboquet in the V&A was supplied by the office that ran the French king's entertainments."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Wikipedia: Cup-and-ball",
          "url": "https://en.wikipedia.org/wiki/Cup-and-ball",
          "note": "Noted in France in the 16th century, Henri III, Louis XV golden age and ivory versions, Rousseau quote, Jane Austen and Bilbo Catcher, kendama and balero variants"
        },
        {
          "title": "V&A collection record: Bilboquet, Paris, 1779 (ivory and mahogany)",
          "url": "https://api.vam.ac.uk/v2/museumobject/O55041",
          "note": "Supplied by the Menus Plaisirs du Roi for the court at Versailles; Henri III (1551-1589) a great enthusiast often seen playing in public; spike for experts, the beginners' cup probably embedded in the mahogany base (item page collections.vam.ac.uk/item/O55041)"
        },
        {
          "title": "V&A collection record: Cup and ball, England, 1880-1900",
          "url": "https://api.vam.ac.uk/v2/museumobject/O37230",
          "note": "Turned and varnished wood with red rings; belonged to Alice Gregory Edwards, born 1881 (item page collections.vam.ac.uk/item/O37230)"
        },
        {
          "title": "Sotheby's: Game Austen, the childhood toy that captivated the Pride and Prejudice author",
          "url": "https://www.sothebys.com/en/articles/game-austen-the-childhood-toy-that-captivated-pride-and-prejudice-author",
          "note": "Austen-Leigh's 1871 memoir quote and the auction in London on 13 December 2016; the article dates the letter to Cassandra to 1809 (see uncertainties)"
        },
        {
          "title": "Sotheby's lot 123, English Literature, History, Children's Books and Illustrations, 13 December 2016: [Austen, Jane] cup-and-ball game (bilbocatch)",
          "url": "https://www.sothebys.com/en/auctions/ecatalogue/2016/english-literature-history-childrens-books-illustrations-l16408/lot.123.html",
          "note": "Carved ivory with string, c. 1800, height 175 mm, estimate £20,000 to 30,000; by descent in the Austen and Knight families"
        },
        {
          "title": "Reveries Under the Sign of Austen: Jane Austen's Letters, Letter 60, 24 to 25 October 1808, from Castle Square",
          "url": "https://reveriesunderthesignofausten.wordpress.com/2012/01/10/jane-austens-letters-letter-60-mon-tues-24-25-oct-1808-from-castle-square/",
          "note": "Reproduces the letter to Cassandra from Southampton: \"bilbocatch, at which George is indefatigable\", written while nephews Edward and George were staying after their mother's death"
        },
        {
          "title": "Wikipedia: Kendama",
          "url": "https://en.wikipedia.org/wiki/Kendama",
          "note": "Believed by some to derive from the French bilboquet, or to have reached Japan from China by the Silk Road; modern shape created in 1919 in Kure"
        },
        {
          "title": "Museum Wales: Cup and Ball",
          "url": "https://museum.wales/traditional_toys/cup_and_ball/",
          "note": "Popular in 16th-century France as the bilboquet; simple home-made version"
        }
      ],
      "uncertainties": [
        "Sotheby's article dates Austen's bilbocatch letter to 1809, but the letter itself (Letter 60 in Deirdre Le Faye's edition) is dated 24 to 25 October 1808, written from Castle Square, Southampton, while her nephews were staying after their mother's death on 10 October 1808. October 1808 is used.",
        "Henri III's reign dates (1574 to 1589) are not on any page opened; the V&A gives only his life dates, 1551 to 1589, so the story says only that he died in 1589.",
        "Wikipedia says kendama is \"believed by some\" to descend from the bilboquet and also gives an alternative route from China by the Silk Road in the Edo period, so the descent is hedged.",
        "Sources disagree on origin: Wikipedia says the toy was created in the 14th century and noted in France by the 16th; the V&A record says the game originated in Mexico in the 16th century. The French court craze of the 1580s is the best-documented early date, so \"c. 1580s France\" is used.",
        "Museum Wales claims Queen Elizabeth I and her courtiers played it; no primary evidence was found, so it is not used.",
        "No Australian reference to cup and ball could be found in any page opened (Trove was behind bot-protection), so there is no Australian anecdote."
      ],
      "nameNotes": "Kendama is a generic Japanese name, but many modern kendama are branded products; use \"cup and ball\" or \"bilboquet\" and avoid brand names.",
      "confidence": "medium",
      "playable": false,
      "realLife": true,
      "kind": "game"
    },
    {
      "id": "hopscotch",
      "title": "Hopscotch",
      "era": "1800s",
      "year": 1677,
      "yearLabel": "First recorded in English in the 1600s; played all through the 1800s",
      "origin": "England; earliest written records in the 1600s (\"Scotch-hoppers\")",
      "blurb": "Toss a stone into a numbered court chalked on the ground, then hop through every square without touching a line.",
      "story": [
        "Nobody knows exactly where hopscotch began. A popular legend says Roman soldiers invented it, but the German archaeologist Ulrich Schädler found no evidence of it before the 1500s. The first English records are from the 1600s: Francis Willughby's handwritten Book of Games, compiled between 1635 and 1672, describes \"Scotch Hopper\", Thomas Shadwell's play The Sullen Lovers (1668) mentions \"Scotch-hopp\", and Poor Robin's Almanack for 1677 promised to tell \"the time when schoolboys should play at Scotch-hoppers\".",
        "The name has nothing to do with Scotland. A \"scotch\" was a scratched or cut line, so the game was \"hopping over scratches\". In 1707 Poor Robin's Almanack joked that lawyers and physicians had so little to do that month they might as well play Scotch-hoppers. Webster's American dictionary of 1828 still called it Scotch-hopper, \"a play in which boys hop over scotches and lines\".",
        "In 1894 Alice Gomme collected hopscotch rules from all over Britain. In Kent, children threw a stone into square one, hopped to the end and back, then did harder rounds carrying the stone on a shoe, a thumb, a palm, the head and even an eyelid. In Whitby it was called Pally-ully and played with rounded bits of broken pottery. In 1902 a London writer described girls chalking circles and \"spider's web\" patterns on pavements.",
        "Hopscotch came to Australia with British settlers and has never left. Dorothy Howard wrote about Australian hopscotch after her fieldwork in the mid-1950s, and a 2007 to 2011 study of 19 Australian primary schools found children still hopping on courts painted onto the asphalt, throwing a stone, stick or woodchip as their \"taw\"."
      ],
      "howToPlay": [
        "Chalk a court of eight to ten numbered squares on the ground and find a flat stone or marker.",
        "Throw your stone into square 1. It must land inside the square without touching a line.",
        "Hop through the court on one foot, skipping the square with your stone, and hop back. You may put two feet down where two squares sit side by side.",
        "On the way back, pick up your stone while balanced on one foot, then hop out.",
        "Next turn, throw into square 2, then 3, and so on. If you step on a line, miss the square or put a foot down, your turn ends.",
        "Once you have finished every number, try the hard rounds: walk the court with the stone balanced on your shoe, then on your head."
      ],
      "didYouKnow": [
        "The \"scotch\" in hopscotch means a scratched line, not Scotland.",
        "In 1707 an almanac joked that lawyers and doctors had so little work that month they could play Scotch-hoppers.",
        "In April 2020, during lockdown, people in Edinburgh chalked a giant hopscotch of about 1,400 squares stretching 400 metres up one street.",
        "Kent children in the 1890s finished hopscotch by walking the court with the stone balanced on an eyelid."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Wikipedia: Hopscotch",
          "url": "https://en.wikipedia.org/wiki/Hopscotch",
          "note": "Willughby's Book of Games (1635-1672), Shadwell 1668, Poor Robin's Almanack 1677 and 1707, Webster 1828, OED etymology, Schädler on origins, Edinburgh 2020"
        },
        {
          "title": "Gomme, The Traditional Games of England, Scotland and Ireland, vol. 1 (1894), entry Hop-scotch",
          "url": "https://archive.org/download/traditionalgames01gomm/traditionalgames01gomm_djvu.txt",
          "note": "1890s rules from Kent, St Neots, Whitby (Pally-ully), Sheffield (Hop-score) and the stone-balancing rounds"
        },
        {
          "title": "Gomme, The Traditional Games of England, Scotland and Ireland, vol. 2 (1898), entry Scotch-hoppers",
          "url": "https://archive.org/download/traditionalgames02gommuoft/traditionalgames02gommuoft_djvu.txt",
          "note": "Quotes Poor Robin's Almanack for 1677, 1707 and 1740"
        },
        {
          "title": "Victorian London (Lee Jackson): Playing in the street",
          "url": "https://www.victorianlondon.org/childhood/streetgames.htm",
          "note": "Edwin Pugh's 1902 description of London girls playing hopscotch with circles, numbers and spider's web patterns"
        },
        {
          "title": "Childhood, Tradition and Change database (University of Melbourne): Hopscotch",
          "url": "https://ctac.esrc.unimelb.edu.au/biogs/E000129b.htm",
          "note": "2008 observations of hopscotch on painted courts in Australian schools, using a stone, stick or woodchip as the taw"
        },
        {
          "title": "Darian-Smith, The Heritage of Australian Children's Play and Oral Tradition (2013)",
          "url": "https://journal.oraltradition.org/wp-content/uploads/files/articles/28ii/08_28.2.pdf",
          "note": "Dorothy Howard's mid-1950s Australian publications included hopscotch; 2007-2011 study of 19 schools"
        },
        {
          "title": "V&A blog: Pandemic Objects: Hopscotch",
          "url": "https://www.vam.ac.uk/blog/design-and-society/pandemic-objects-hopscotch",
          "note": "Leamington Terrace, Edinburgh, April 2020: a 400 metre court of some 1,400 squares, later washed away by rain"
        }
      ],
      "uncertainties": [
        "The earliest dated citation is Shadwell's play of 1668 (via the OED as cited on Wikipedia), with Poor Robin's Almanack 1677 the best-known. Francis Willughby's manuscript Book of Games, compiled between 1635 and 1672, may be earlier but cannot be dated exactly, so the yearLabel gives the century and 1677 is used for sorting.",
        "Wikipedia gives the Edinburgh lockdown hopscotch as \"nearly 1,000 squares\", an early count; the V&A blog's later figure of about 1,400 squares over 400 metres is used.",
        "Darian-Smith says only that Dorothy Howard visited Australia in the mid-1950s; the exact years 1954 to 1955 appear only in search snippets from pages that could not be opened.",
        "Claims that Australian children call the game \"Hoppy\" or play \"Aeroplane Hoppy\" appeared only in search snippets from pages that could not be opened, so they are not included.",
        "No 19th-century Australian newspaper report could be opened (Trove was behind bot-protection)."
      ],
      "nameNotes": "",
      "confidence": "high",
      "playable": false,
      "realLife": true,
      "kind": "game"
    },
    {
      "id": "twenty-questions",
      "title": "Twenty Questions",
      "era": "1800s",
      "year": 1786,
      "yearLabel": "Played by 1786; a Victorian parlour favourite",
      "origin": "England; recorded at a London party in 1786",
      "blurb": "Think of anything in the world, from a teaspoon to the Great Wall of China, and your friends have just twenty yes-or-no questions to guess it.",
      "story": [
        "Twenty Questions needs no board, cards or dice, which made it perfect for a Victorian parlour on a winter evening. One player thinks of a person, place or thing. The others ask questions that can only be answered 'yes' or 'no', and must guess the answer before their twentieth question runs out. Lying is not allowed.",
        "The game was already popular in the 1780s. In a letter dated 17 February 1786 the writer Hannah More described teaching 'the play of twenty questions' to the painter Sir Joshua Reynolds and Lord Palmerston at a small evening party. The former prime minister Lord North overheard and demanded a turn, but 'his twenty questions were exhausted before he came near the truth'.",
        "Charles Dickens put a version called 'Yes and No' into A Christmas Carol in 1843. At his nephew's Christmas party, Scrooge watches the guests fire questions at Fred, who answers only yes or no, and the answer turns out to be a savage, growling animal that lives in London: Uncle Scrooge himself.",
        "Many families played it as 'Animal, Vegetable or Mineral', borrowing the three kingdoms of nature from the scientist Linnaeus. The first question sorts the answer into one of the three. A leather belt is animal, a wooden table is vegetable, and a coin is mineral. In 1946 the game became a hit American radio show."
      ],
      "howToPlay": [
        "One player, the answerer, secretly thinks of a person, place or thing.",
        "The others may first ask whether it is animal, vegetable or mineral.",
        "Players take turns asking questions that can be answered only 'yes' or 'no'. Keep count of the questions.",
        "The answerer must tell the truth. Some families allow 'sometimes' or 'maybe' if the answer is unclear.",
        "If someone guesses correctly within twenty questions, they win and become the next answerer. If the twenty run out, the answerer wins."
      ],
      "didYouKnow": [
        "In 1786 Lord North, who had been prime minister during the American Revolution, used up all twenty questions and still failed to guess. The answer was 'the earthen lamp of Epictetus', which he said he had mentioned in the House of Commons only the night before.",
        "In A Christmas Carol (1843), Scrooge's nephew plays 'Yes and No', and the thing everyone is guessing turns out to be Scrooge.",
        "On the 1946 radio version, listeners sent in Winston Churchill's cigar as a puzzle more often than any other object."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Twenty questions - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Twenty_questions",
          "note": "Common by the 1780s, Hannah More letter, Dickens 'Yes and No', Linnaean kingdoms, 1946 radio show, Churchill's cigar, rules and the 'maybe' variant."
        },
        {
          "title": "Memoirs of the Life and Correspondence of Mrs. Hannah More, vol. 2 (William Roberts, 1834), full text on Internet Archive",
          "url": "https://archive.org/download/memoirsoflifecor0002robe/memoirsoflifecor0002robe_djvu.txt",
          "note": "Primary text of the letter headed 'London, Feb. 17, 1786': 'a small party the other night', teaching Sir Joshua and Lord Palmerston 'the play of twenty questions', Lord North's failure, and the lamp of Epictetus."
        },
        {
          "title": "Laudator Temporis Acti: The Lamp of Epictetus (quoting Hannah More's letter via Augarde, The Oxford Guide to Word Games)",
          "url": "https://laudatortemporisacti.blogspot.com/2005/12/lamp-of-epictetus.html?m=1",
          "note": "Secondary quotation of the 17 February 1786 letter about Reynolds, Palmerston and Lord North."
        },
        {
          "title": "A Christmas Carol by Charles Dickens, Project Gutenberg plain text",
          "url": "https://www.gutenberg.org/cache/epub/46/pg46.txt",
          "note": "Primary text of the 'Yes and No' game in Stave Three."
        }
      ],
      "uncertainties": [
        "Wikipedia gives the Hannah More letter date as 7 February 1786, but the printed Memoirs (1834), opened on the Internet Archive, head the letter 'London, Feb. 17, 1786', so 17 February is used. The letter describes 'a small party the other night', not a dinner.",
        "The 1786 date is before this hall's 1800 start, but the game is included as a parlour staple of the 1800s.",
        "Lord North's earlier career as prime minister is standard history and is not stated in the pages opened.",
        "No Australian evidence was opened; Trove blocked automated access."
      ],
      "nameNotes": "",
      "confidence": "medium",
      "playable": false,
      "realLife": true,
      "kind": "game"
    },
    {
      "id": "hoop-and-stick",
      "title": "Hoop and Stick",
      "era": "1800s",
      "year": 1800,
      "yearLabel": "Ancient; a street craze all through the 1800s",
      "origin": "Ancient Greece (the trochus); a Victorian street toy in Britain and Australia",
      "blurb": "Bowl a big wooden or iron hoop along the street with a stick and see how far you can keep it rolling.",
      "story": [
        "Greek children were bowling hoops 2,500 years ago. They called the hoop a trochus, drove it with a short stick called an elater, and Greek doctors recommended hoop rolling as healthy exercise: a medical text by Antyllus in the 100s CE describes it as therapy for body and mind. The Romans copied the game. In England children are said to have been playing it by the 1400s, and even Cambridge University graduates trundled hoops after lectures until a rule, said to have been passed before 1816, banned Masters of Arts from doing it.",
        "In the 1800s hoops went wild. Wooden hoops made of bent ash were driven with a short stick; heavier iron hoops were guided with a metal hook. Through the 1840s London newspapers raged against \"The Hoop Nuisance\". A reader wrote to The Times in October 1842 that an iron hoop had left a large scar on his shin. Police confiscated hoops, but the complaints only grew.",
        "The fuss reached Australia. In August 1858 the Hobart Town Daily Mercury reported that a boy's hoop had struck a horse's legs in Macquarie Street, making it rear, and that in Davey Street a hoop belonging to one of three boys racing their hoops had torn an elderly lady's silk dress. The paper wanted boys forced out to the quiet suburbs by a council by-law, strictly enforced by police.",
        "In 1864 the computer pioneer Charles Babbage joined the campaign, complaining that iron hoops driven under horses' legs threw riders. He was mocked in the House of Commons for his \"crusade against the popular game of tip-cat and the trundling of hoops\". Rolling a hoop on a footpath had in fact been an offence in London since the Metropolitan Police Act of 1839, and in other English towns from 1847, but the complaints kept coming. Children in England were still bowling wooden hoops in the early 1900s."
      ],
      "howToPlay": [
        "Find a large hoop (a wooden one is lighter and safer) and a short stick about 30 centimetres long.",
        "Stand the hoop upright, give it a push to start it rolling, and run alongside it.",
        "Tap the back of the hoop with your stick to keep it rolling and steer it by tapping it on one side.",
        "See how far you can go without the hoop falling over, or race a friend over a set distance.",
        "Try tricks: roll it around a tree, through a gateway, or over a bump without it toppling.",
        "Play in a park or playground, not on a road or footpath, which is exactly what the Victorians complained about."
      ],
      "didYouKnow": [
        "An ancient Greek doctor, Antyllus, wrote that rolling a hoop was good medicine for body and mind.",
        "In 1858 a Hobart newspaper demanded boys with hoops be banished to the suburbs after one tore an elderly lady's silk dress.",
        "Computer pioneer Charles Babbage was ridiculed in Parliament in 1864 for crusading against boys trundling hoops.",
        "Roman hoops carried loose metal rings so they jingled a warning to people walking, and some Victorian boys nailed pairs of tin squares inside their hoops to rattle the same way."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Wikipedia: Hoop rolling",
          "url": "https://en.wikipedia.org/wiki/Hoop_rolling",
          "note": "Greek trochus and elater, Antyllus text preserved by Oribasius, Martial on jingling rings, 15th-century England, Strutt, 1840s Hoop Nuisance, police confiscation, Babbage 1864, Cambridge rule before 1816, tin squares nailed inside hoops, early 1900s England; quotes the Hobart Town Daily Mercury of 18 August 1858 in full"
        },
        {
          "title": "Victorian London (Lee Jackson): Playing in the street",
          "url": "https://www.victorianlondon.org/childhood/streetgames.htm",
          "note": "Letter to The Times, 1 October 1842, about a scar on the writer's shin from a charity boy's iron hoop"
        },
        {
          "title": "Metropolitan Police Act 1839, section 54 (legislation.gov.uk)",
          "url": "https://www.legislation.gov.uk/ukpga/Vict/2-3/47/section/54",
          "note": "Made it an offence in London to \"roll or carry any cask, tub, hoop, or wheel\" upon any footway"
        },
        {
          "title": "Town Police Clauses Act 1847, section 28 (legislation.gov.uk)",
          "url": "https://www.legislation.gov.uk/ukpga/Vict/10-11/89/section/28",
          "note": "Extended the same footway offence (rolling any cask, tub, hoop or wheel) to other towns; repealed for England and Wales in 2015"
        }
      ],
      "uncertainties": [
        "The two sceptics' reports disagreed about the end of the hoop campaign: one said no law was ever passed (from a blog page that has now been dropped as a source), the other found that the Metropolitan Police Act 1839 and the Town Police Clauses Act 1847 already made rolling a hoop on a footway an offence. The Acts, read on legislation.gov.uk, are followed here, and the claim that hoops stayed popular \"across the British Empire\" has been dropped as unsupported.",
        "Wikipedia says Hippocrates recommended hoop rolling, but cites only a 1985 book and no ancient source was found, so the better-documented text by Antyllus (preserved by Oribasius) is used instead.",
        "The 1858 Hobart Town Daily Mercury report is quoted from the Wikipedia article, which cites Trove article 3249974; Trove itself could not be opened because of its bot-protection.",
        "The Cambridge rule from before 1816 rests on a 19th-century essay cited by Wikipedia and was not independently checked.",
        "Wikipedia's claim that English children played with hoops as early as the 15th century rests on a 19th-century history book and was not checked further."
      ],
      "nameNotes": "",
      "confidence": "high",
      "playable": false,
      "realLife": true,
      "kind": "game"
    },
    {
      "id": "knucklebones",
      "title": "Knucklebones (Jacks, Fivestones)",
      "era": "1800s",
      "year": 1800,
      "yearLabel": "Ancient; played all through the 1800s",
      "origin": "Ancient Greece and Rome (astragaloi, tali); played with sheep ankle bones",
      "blurb": "Throw five sheep bones in the air and catch them on the back of your hand, then pick them up one, two, three and four at a time.",
      "story": [
        "Knucklebones is one of the oldest games we know. The name comes from the ancient Greek version, played with the astragalus, a small ankle bone from a sheep. Plato and Herodotus both wrote about it, Homer's poems hint at games like it, and Sophocles said the hero Palamedes invented it during the Trojan War. A wall painting dug up at Pompeii shows goddesses playing the Roman version, called tali, and ancient schoolchildren were given knucklebones as prizes.",
        "By the 1800s British children knew the game as fivestones, dibs, dabs, snobs or jacks. In 1894 Alice Gomme had a newspaper boy at Richmond station show her how to play with five bits of tile. In Nottinghamshire the tricks had names like One-ers, Two-ers, Four Squares, Trotting Donkeys, Fly-catchers and Magic, and only experts were expected to finish the hardest ones.",
        "In Australia sheep were everywhere, so kids used real bones. The Powerhouse Museum holds two homemade sets of sheep ankle bones used by children around Gunning in New South Wales, dated between about 1830 and 1950. By the 1960s toy makers were selling plastic jacks shaped just like the ones from sheep.",
        "Dorothy Howard saw children playing knucklebones in Australia in the mid-1950s. When researchers went back to Australian playgrounds between 2007 and 2011 they found knucklebones, like marbles, was no longer widely played and sometimes only came back when a teacher taught it."
      ],
      "howToPlay": [
        "You need five knucklebones, small stones or jacks. Sit on the ground or at a table.",
        "Throw all five up and catch as many as you can on the back of your hand, then toss them again and catch them in your palm.",
        "\"Ones\": scatter four bones. Throw the fifth up, snatch one bone from the ground and catch the falling bone in the same hand. Repeat until all are picked up.",
        "\"Twos\", \"threes\" and \"fours\": do the same, but pick up the bones two at a time, then three and one, then all four together.",
        "If you drop a bone or miss a catch, your turn ends and the next player has a go. The first player to finish every trick wins."
      ],
      "didYouKnow": [
        "A wall painting from Pompeii, now in Naples, shows goddesses playing knucklebones.",
        "In ancient Greece knucklebones were handed out as prizes to schoolchildren.",
        "Mongolian knucklebone shooting, played with sheep ankle bones, was added to UNESCO's heritage list in 2014.",
        "Nottinghamshire children in the 1890s had tricks called Trotting Donkeys, Fly-catchers and Magic."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Wikipedia: Knucklebones",
          "url": "https://en.wikipedia.org/wiki/Knucklebones",
          "note": "Greek astragalus of sheep, allusions in Homer, Plato, Herodotus, Sophocles, Pompeii painting of tali, prizes for schoolchildren, Bruegel, UNESCO shagai 2014"
        },
        {
          "title": "Gomme, The Traditional Games of England, Scotland and Ireland, vol. 1 (1894), entry Fivestones",
          "url": "https://archive.org/download/traditionalgames01gomm/traditionalgames01gomm_djvu.txt",
          "note": "Newspaper boy at Richmond station playing Dabs; South Notts Snobs with One-ers, Two-ers, Four Squares, Trotting Donkeys, Fly-catchers, Magic"
        },
        {
          "title": "Powerhouse Collection: Homemade jacks or knucklebones used at Gunning, New South Wales",
          "url": "https://collection.powerhouse.com.au/object/80963",
          "note": "Two sets of five sheep ankle bones, c. 1830-1950; plastic bone-shaped versions by the 1960s"
        },
        {
          "title": "V&A collection record: \"genuine china clay 5 stones dibs\" (1930s)",
          "url": "https://api.vam.ac.uk/v2/museumobject/O27722",
          "note": "Explains dibs, fivestones and jacks as names for the same family of games (item page collections.vam.ac.uk/item/O27722)"
        },
        {
          "title": "Darian-Smith, The Heritage of Australian Children's Play and Oral Tradition (2013)",
          "url": "https://journal.oraltradition.org/wp-content/uploads/files/articles/28ii/08_28.2.pdf",
          "note": "Howard saw knucklebones (jacks) in the mid-1950s; 2007-2011 study found it no longer widely played"
        }
      ],
      "uncertainties": [
        "Darian-Smith says only that Dorothy Howard visited Australia in the mid-1950s and witnessed games including knucklebones; the exact years and the extent of her travels are not on any page opened.",
        "The V&A record O27722 gives a production date of 1930s but its piece-by-piece descriptions say \"English 1950-1959\", so the boxed set may be from either decade.",
        "Museums Victoria's Dorothy Howard knucklebones pages (including the detail that Australian children coloured bones by boiling them with ink or dye) could not be opened, so that detail is left out.",
        "The Powerhouse date range of about 1830 to 1950 for the Gunning bones is broad; the museum does not say exactly when they were made.",
        "The Australian stage names for the tricks (for example \"horses in the stable\") could not be verified from an opened page, so Gomme's 1894 English names are given instead."
      ],
      "nameNotes": "\"Jacks\" is a generic name; avoid brand names printed on modern boxed sets.",
      "confidence": "high",
      "playable": false,
      "realLife": true,
      "kind": "game"
    },
    {
      "id": "marbles",
      "title": "Marbles (Ring Taw)",
      "era": "1800s",
      "year": 1800,
      "yearLabel": "Ancient; played all through the 1800s",
      "origin": "Ancient; stone marbles found at Mohenjo-daro (Indus Valley), cheap glass marbles made in Germany from the mid-1800s",
      "blurb": "Flick your big \"taw\" marble at a ring of little ones and every marble you knock out is yours to keep.",
      "story": [
        "People have played with little round balls for thousands of years. Archaeologists found stone marbles at Mohenjo-daro in the Indus Valley from about 2500 BCE, and the Romans played a version with walnuts. Marbles reached Britain in the Middle Ages, shipped in from the Low Countries. Marble games are said to have been so popular in Nuremberg in Germany that in 1503 the town council limited them to a meadow outside the town.",
        "In the 1800s marbles got cheap. A German glassblower invented \"marble scissors\" in 1846 to snip molten glass into balls, and ceramic marbles were mass-produced from the 1870s. In 1903 Martin Christensen of Akron, Ohio, made the first machine-made glass marbles. Australian kids played with the same kinds: a bag of 43 ceramic and glass marbles owned by Walter Skelton in Boggabri, New South Wales, in the 1890s is now in the Powerhouse Museum.",
        "Alice Gomme's 1898 volume of traditional games describes Ring Taw: boys drew a rough ring on the ground, each put in an equal share of \"stonies\", and shot at them with their best marble, the taw. Players bartered marbles too: her 1894 volume prices a prized \"alley\" at three stonies. In 1932 the British Marbles Championship began at Tinsley Green in Sussex. It is a team game played on a raised sand ring and is still held there every Good Friday.",
        "When American folklorist Dorothy Howard toured Australia in the mid-1950s, marbles was one of the games she wrote about. By the time researchers visited 19 Australian primary schools between 2007 and 2011, marbles was no longer widely played, and in some schools only started again when teachers introduced it."
      ],
      "howToPlay": [
        "Draw a ring on the ground, about a metre across. Each player puts the same number of small marbles inside it.",
        "Everyone bowls a marble towards the ring from a line a few steps away. The player whose marble lands closest shoots first.",
        "Kneel at the edge of the ring with your knuckle on the ground and flick your big taw marble at the marbles inside.",
        "Every marble you knock out of the ring is yours, and you keep shooting until you miss.",
        "If your taw stops inside the ring, you are \"fat\": put back any marbles you won this turn and the next player shoots.",
        "In the 1800s the game was often played for \"keepsies\", where winners kept the marbles they knocked out. For a school game, give everyone their marbles back at the end."
      ],
      "didYouKnow": [
        "Nuremberg's town council is said to have limited marble games to a meadow outside the town walls in 1503.",
        "The British and World Marbles Championship has been played at the Greyhound pub in Tinsley Green, Sussex, every Good Friday since 1932.",
        "Cambridge University is said to have passed a rule, some time before 1816, forbidding its Masters of Arts from rolling hoops or playing marbles.",
        "In Sussex the marbles season traditionally ran from Ash Wednesday to midday on Good Friday; playing after that was thought unlucky."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Wikipedia: Marble (toy)",
          "url": "https://en.wikipedia.org/wiki/Marble_(toy)",
          "note": "Mohenjo-daro marbles, Nuremberg 1503, marble scissors 1846, ceramic marbles 1870s, Akron 1903, Ring Taw, Tinsley Green 1932, Ash Wednesday to Good Friday season, keepsies and taw terms"
        },
        {
          "title": "Wikipedia: British and World Marbles Championship",
          "url": "https://en.wikipedia.org/wiki/British_and_World_Marbles_Championship",
          "note": "Held at the Greyhound, Tinsley Green, every Good Friday since 1932; a team game with sides of six on a raised sand-covered ring; first winners the Black Horse team from Hookwood"
        },
        {
          "title": "Wikipedia: Tinsley Green",
          "url": "https://en.wikipedia.org/wiki/Tinsley_Green",
          "note": "Championship at the Greyhound every year since 1932; first winners a team from Hookwood; the local season from Ash Wednesday to midday on Good Friday"
        },
        {
          "title": "Gomme, The Traditional Games of England, Scotland and Ireland, vol. 2 (1898), entry Ring-taw",
          "url": "https://archive.org/download/traditionalgames02gommuoft/traditionalgames02gommuoft_djvu.txt",
          "note": "1890s rules for Ring Taw: equal shares in the ring, nearest bowler shoots first, \"fat\" taw, knuckle-down shooting"
        },
        {
          "title": "Gomme, The Traditional Games of England, Scotland and Ireland, vol. 1 (1894), entry Marbles",
          "url": "https://archive.org/download/traditionalgames01gomm/traditionalgames01gomm_djvu.txt",
          "note": "Marble names (alleys, stonies, marrididdles), barter values with an alley worth three stonies, Strutt on marbles as a substitute for bowls"
        },
        {
          "title": "Powerhouse Collection: Bag of marbles from Australia (Boggabri NSW, 1890-1900)",
          "url": "https://collection.powerhouse.com.au/object/148811",
          "note": "43 glass and salt-glazed ceramic marbles owned by Walter P J Skelton as a boy in Boggabri in the 1890s"
        },
        {
          "title": "Darian-Smith, The Heritage of Australian Children's Play and Oral Tradition, Oral Tradition 28/2 (2013)",
          "url": "https://journal.oraltradition.org/wp-content/uploads/files/articles/28ii/08_28.2.pdf",
          "note": "Dorothy Howard's mid-1950s Australian fieldwork covered marbles; 2007-2011 study of 19 schools found marbles no longer widely played and sometimes only taken up when teachers introduced it"
        },
        {
          "title": "Wikipedia: Hoop rolling",
          "url": "https://en.wikipedia.org/wiki/Hoop_rolling",
          "note": "Cambridge statute from before 1816 forbidding Masters of Arts to roll hoops or play marbles"
        }
      ],
      "uncertainties": [
        "Wikipedia's Marble (toy) article says the first Tinsley Green championship in 1932 was won by Ellen Geary, a young girl from London, but Wikipedia's British and World Marbles Championship and Tinsley Green articles both say the first winners were a team, the Black Horse from Hookwood, and the event is a team knockout. No 1932 record could be found, so the Ellen Geary claim is left out.",
        "The Nuremberg 1503 story is cited by Wikipedia only to a 2019 magazine article and a toy-museum website; no primary record was found, so it is given as \"said to\".",
        "The Cambridge rule from before 1816 rests on a 19th-century essay cited by Wikipedia's Hoop rolling article and was not independently checked.",
        "Darian-Smith says only that Dorothy Howard visited Australia in the mid-1950s. Search snippets from Museums Victoria give 1954 to 1955, but its pages returned a 403 error, so \"mid-1950s\" is used.",
        "Museums Victoria's marbles articles (Dorothy Howard collection, Sir Joseph Verco's 1860s Adelaide memories) and Trove newspaper articles were behind bot-protection and could not be opened, so no direct 19th-century Australian newspaper quote is included.",
        "The Strong Museum page says only \"mid-19th century\" for the marble scissors; Wikipedia gives 1846. The 1846 date is used for the invention, but the scissors made hand-cut marbles cheaper rather than mass-produced, so the origin field says \"mid-1800s\".",
        "Wikipedia also cites a claim that marbles at Tinsley Green go back to 1588; this is a magazine tradition rather than a documented record and is not used."
      ],
      "nameNotes": "",
      "confidence": "high",
      "playable": false,
      "realLife": true,
      "kind": "game"
    },
    {
      "id": "skipping",
      "title": "Skipping (Jump Rope)",
      "era": "1800s",
      "year": 1800,
      "yearLabel": "Centuries old; a girls' playground game with rhymes by the 1800s",
      "origin": "Old and widespread; boys' game in 1600s Europe, girls' game with rhymes from the 1700s",
      "blurb": "Jump a turning rope in time to a chant, and when the turners shout \"pepper\" the rope goes faster and faster until you trip.",
      "story": [
        "Skipping is very old. Stone carvings from China's Han dynasty are said to show rope-skipping, and ancient Egyptian pictures are said to show children jumping over vines. In Europe in the 1500s and 1600s it was mostly a boys' game. Writing in 1801, the historian Joseph Strutt said that boys competed to pass the rope the most times without a miss, and that in the hop season a stripped hop stem made a better rope. Girls were discouraged because jumping might show their ankles.",
        "That changed in the 1700s and 1800s. Girls took over skipping, added chants and rhymes, and ran the game themselves. Loose \"pantalettes\" worn under dresses made jumping easier, and in the early 1830s Lydia Maria Child's The Girls' Own Book printed skipping instructions. By the late 1800s skipping ropes with turned wooden handles were being made on an industrial scale, many for export; the V&A holds an English one from 1880 to 1900 with metal-capped handles.",
        "In 1898 Alice Gomme recorded the games girls played with a long rope: \"Pepper, salt, mustard, cider, vinegar\", where the turners speed up until the skipper trips; Chase the Fox; Rock the Cradle; and Winding the Clock. She noted that two ropes turned inwards were already called \"double dutch\". On Good Friday the fisher folk of Brighton skipped on the beach, six to ten adults on one rope.",
        "Australian children skipped to their own rhymes. Dorothy Howard collected playground chants across Australia in the mid-1950s, and one Brisbane school sang its own Charlie Chaplin skipping rhyme. Australian kids turned the rhyme \"Down the Mississippi\" into \"Down the Murray-Darling\". Long-rope skipping was still popular when researchers visited 19 Australian schools between 2007 and 2011."
      ],
      "howToPlay": [
        "For solo skipping, hold a handle in each hand, swing the rope over your head and jump it as it passes under your feet. Count how many jumps you get without a trip.",
        "For a long rope, two turners hold the ends and swing it in a steady arc while skippers line up.",
        "Run in as the rope swings away from you, jump in time, then run out on the far side without stopping the rope.",
        "Chant a rhyme to keep time. For \"Pepper, salt, mustard, cider, vinegar\", the turners start slowly and then turn as fast as they can until the skipper trips.",
        "Try Chase the Fox: a leader runs through, then skips once, then twice, and everyone copies. Anyone who trips becomes a turner."
      ],
      "didYouKnow": [
        "In the 1600s skipping was a boys' game; girls were told it was indecent because it might show their ankles.",
        "Joseph Strutt, writing in 1801, thought a stripped hop stem made a better skipping rope than rope.",
        "\"Double dutch\" was already the name for two ropes turned inwards when Alice Gomme recorded it in 1898.",
        "On Good Friday the fisher folk of Brighton used to skip on the beach, six to ten grown-ups on one rope."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Wikipedia: Skipping rope",
          "url": "https://en.wikipedia.org/wiki/Skipping_rope",
          "note": "Han dynasty carvings, Egyptian vines, boys' game in 16th-17th century Europe, girls and chants from the 18th century, COVID-era boom"
        },
        {
          "title": "Wikipedia: Skipping-rope rhyme",
          "url": "https://en.wikipedia.org/wiki/Skipping-rope_rhyme",
          "note": "Ankles considered indecent, pantalettes, Teddy Bear rhyme dating, Brisbane 1950s Charlie Chaplin rhyme, Opies 1959"
        },
        {
          "title": "Gomme, The Traditional Games of England, Scotland and Ireland, vol. 2 (1898), entry Skipping",
          "url": "https://archive.org/download/traditionalgames02gommuoft/traditionalgames02gommuoft_djvu.txt",
          "note": "Strutt quote (Sports and Pastimes, 1801), Brighton Good Friday skipping, Pepper salt mustard cider vinegar (turners go slowly then as fast as possible), Chase the Fox, Rock the Cradle, Winding the Clock, double dutch"
        },
        {
          "title": "World History Commons: Jumping Rope (The Girls' Own Book, 1833)",
          "url": "https://worldhistorycommons.org/jumping-rope",
          "note": "Lydia Maria Child's skipping instructions from the 1833 New York edition of The Girls' Own Book; pantalettes; 19th-century attitudes to girls' exercise"
        },
        {
          "title": "V&A collection record: Skipping rope, England, 1880-1900",
          "url": "https://api.vam.ac.uk/v2/museumobject/O1313769",
          "note": "Turned wooden handles with metal caps; skipping rope manufacture increased to an industrial level with many made for export (item page collections.vam.ac.uk/item/O1313769)"
        },
        {
          "title": "Schoolhouse Museum (NSW): Chants and rhymes",
          "url": "https://www.schoolhousemuseum.org.au/resources/chants-and-rhymes/",
          "note": "Australian long-rope skipping in the 1950s-1970s; \"Down the Murray-Darling\" adapted from the original rhyme \"Down the Mississippi\""
        },
        {
          "title": "Darian-Smith, The Heritage of Australian Children's Play and Oral Tradition (2013)",
          "url": "https://journal.oraltradition.org/wp-content/uploads/files/articles/28ii/08_28.2.pdf",
          "note": "Dorothy Howard's mid-1950s fieldwork; skipping still popular in the 2007-2011 study of 19 Australian schools"
        }
      ],
      "uncertainties": [
        "The Han dynasty carvings and Egyptian vine pictures rest on Wikipedia alone with no primary evidence checked, so they are given as \"said to\" and the origin confidence stays medium.",
        "Wikipedia says \"16th century\" explorers reported Aboriginal Australians jumping with vines; Europeans did not reach Australia until the 1600s, so that date looks wrong and the claim is left out.",
        "The Girls' Own Book was first published in Boston in 1831 or 1832 according to the sceptics' report; the edition cited by World History Commons is the 1833 New York one, so \"early 1830s\" is used.",
        "Darian-Smith says only that Dorothy Howard visited Australia in the mid-1950s; the exact years 1954 to 1955 were not found on any page that could be opened.",
        "Trove and Museums Victoria pages with 19th-century and 1950s Australian skipping rhymes could not be opened."
      ],
      "nameNotes": "",
      "confidence": "medium",
      "playable": false,
      "realLife": true,
      "kind": "game"
    },
    {
      "id": "mansion-of-happiness",
      "title": "The Mansion of Happiness",
      "era": "1800s",
      "year": 1800,
      "yearLabel": "1800 (England); 1843 (USA)",
      "origin": "George Fox, published by Laurie and Whittle, London; W. and S. B. Ives, Salem, Massachusetts",
      "blurb": "Throw the dice or spin a top, race around a spiral of 67 squares showing virtues, vices and punishments, and try not to land on the Whipping Post on your way to the Mansion of Happiness.",
      "story": [
        "The Mansion of Happiness is a race game with a moral. In the English original, players threw two dice; the American edition replaced them with a teetotum (a small spinning top with numbered sides). Either way, players move around a spiral of 67 numbered squares. Landing on a virtue such as Honesty or Charity sends you forward. Landing on a vice such as Cruelty or Immodesty sends you back or costs you counters. The winner is the first to reach the Mansion of Happiness in the centre.",
        "It was invented by George Fox, a poet, and published in August 1800 by Robert Laurie and James Whittle of 53 Fleet Street, London. The board was dedicated to the Duchess of York and the centre picture showed her home, Oatlands Park. Three editions appeared in 1800, and the first was printed with ink said to contain real gold.",
        "In the United States, William and Stephen Ives of Salem, Massachusetts published a near-exact copy on 25 November 1843. Dice were considered sinful, called 'the bones of the Devil', so a teetotum was used instead. Between 3,000 and 4,000 copies had sold by September 1844.",
        "When Parker Brothers reissued it in 1894, the box claimed it was 'the first board game ever published in America'. That is not quite true: a geography game, The Travellers' Tour Through the United States, had appeared in 1822. For nearly 150 years a Salem woman, Anne Abbott, was wrongly credited as the designer; in fact she designed other Ives games, including Doctor Busby."
      ],
      "howToPlay": [
        "Each player places a token on the first square and takes a small stock of counters.",
        "Take turns throwing the dice (or spinning the teetotum) and moving your token that many squares along the spiral track.",
        "If you land on a virtue square, follow its instruction and move forward.",
        "If you land on a vice square, move back, pay counters, or miss a turn as the square says. In the 1800 rules a liar, swearer or Sabbath-breaker was sent to the Whipping Post, a real public punishment in England at that time.",
        "The first player to reach the Mansion of Happiness in the centre wins."
      ],
      "didYouKnow": [
        "The first 1800 edition was printed with an ink described as containing real gold.",
        "The American publishers used a spinning top instead of dice because dice were called 'the bones of the Devil'.",
        "Anne Abbott was wrongly credited as the designer for nearly 150 years, even though she had really designed other Ives games such as Doctor Busby."
      ],
      "computer": "",
      "sources": [
        {
          "title": "The Mansion of Happiness - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/The_Mansion_of_Happiness",
          "note": "George Fox 1800, three editions, gold ink, Ives 25 November 1843, teetotum and 'bones of the Devil', sales to September 1844, Anne Abbott error and her Doctor Busby game, Parker Brothers 1894."
        },
        {
          "title": "The Mansion of Happiness, Laurie and Whittle, 1800 - V&A Collections",
          "url": "https://collections.vam.ac.uk/item/O26298/the-mansion-of-happiness-laurie-board-game/",
          "note": "August 1800, 53 Fleet Street, 67 squares (66 compartments of virtues and vices plus the Mansion), Oatlands Park, Duchess of York, full 1800 rules including 'a box and a pair of dice' and rule 9 on the Whipping Post."
        },
        {
          "title": "American Board and Card Game History - The Strong, Google Arts and Culture",
          "url": "https://artsandculture.google.com/story/american-board-and-card-game-history-the-strong/dgVhZCrQ9FmHJw?hl=en",
          "note": "Ives 1843 as near-exact copy of the English game; Travellers' Tour 1822 as the first known American board game."
        }
      ],
      "uncertainties": [
        "The V&A record describes 66 compartments of virtues and vices with the Mansion of Happiness itself as square 67, which is why '67 squares' is used; a search summary that said 66 was counting without the final square.",
        "The 1800 English rules printed on the V&A record call for 'a box and a pair of dice'; only the 1843 American edition used a teetotum. Both are now described in the entry.",
        "The V&A record calls the 1843 Ives edition 'thought to be the first US board game', which conflicts with Wikipedia and The Strong, who name The Travellers' Tour of 1822; the entry follows Wikipedia and The Strong.",
        "Wikipedia's dates for the Anne Abbott error, 1843 to 1989, are marked 'citation needed', so the entry says 'nearly 150 years' rather than an exact figure.",
        "No evidence about the game in Australia was found."
      ],
      "nameNotes": "",
      "confidence": "high",
      "playable": false,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "kaleidoscope",
      "title": "Kaleidoscope",
      "era": "1800s",
      "year": 1817,
      "yearLabel": "1817",
      "origin": "David Brewster, Scotland",
      "blurb": "A Scottish scientist's tube of mirrors and coloured glass sold about 200,000 copies in London and Paris in just three months in 1817.",
      "story": [
        "A kaleidoscope is a tube with two or more mirrors set at an angle inside it. Loose pieces of coloured glass sit at one end. When you look through the eyepiece and turn the tube, the mirrors reflect the glass into perfectly symmetrical patterns that change every time the pieces tumble. The name comes from three Greek words meaning 'beautiful form watcher'.",
        "The Scottish scientist David Brewster invented it while studying how light reflects, and took out British patent number 4136 in July 1817. Things went wrong at once. Before his maker could build any for sale, one patent instrument was shown to London opticians, and cheap copies flooded the shops.",
        "Brewster wrote in 1819 that, by the best estimate, 'no fewer than two hundred thousand instruments have been sold in London and Paris during three months'. He complained that, of all those sold, perhaps not even a thousand were built properly. Philip Carpenter of Birmingham became the authorised maker, stamping his tubes 'sole maker'. In 1818 Brewster got Carpenter's agreement to let other firms make it too, but Carpenter's own firm went on selling kaleidoscopes for sixty years.",
        "Brewster hoped the kaleidoscope would help designers of carpets, wallpaper and jewellery create new patterns. Instead it became one of the first true toy crazes of the 1800s, and it has never gone out of production."
      ],
      "howToPlay": [
        "Hold the kaleidoscope up to one eye and point the far end towards a window or lamp so light comes through.",
        "Look at the pattern made by the coloured glass reflected in the mirrors.",
        "Slowly turn the tube, or the end chamber, so the pieces tumble and the pattern changes.",
        "Try to find a pattern you like, then turn again. The same pattern will almost never come back.",
        "Challenge a friend to draw the pattern they see before it changes."
      ],
      "didYouKnow": [
        "Brewster patented the kaleidoscope in July 1817, but copies were on sale before his own maker had built any.",
        "Brewster reported that people had calculated 24 pieces of glass could be combined in so many ways that viewing them all would take hundreds of thousands of millions of years, and then said even that figure was far too small.",
        "The 1819 treatise lists more than a dozen London makers of 'patent kaleidoscopes', including the famous optical firm Dollond."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Kaleidoscope - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kaleidoscope",
          "note": "Patent number 4136 granted July 1817, Greek etymology, Philip Carpenter as 'sole maker', Brewster's 1818 permission for other manufacturers, 200,000 sold claim, copying problem."
        },
        {
          "title": "A Treatise on the Kaleidoscope by David Brewster (1819), full text on Internet Archive",
          "url": "https://archive.org/stream/b29295440/b29295440_djvu.txt",
          "note": "Brewster's own words: 'no fewer than two hundred thousand instruments' sold in three months and 'perhaps not one thousand constructed upon scientific principles'; the premature exhibition to London opticians; the 24 pieces calculation made by 'many persons, entirely ignorant of the nature of the instrument'; the list of makers."
        }
      ],
      "uncertainties": [
        "The 200,000 figure is Brewster's own estimate and cannot be independently checked.",
        "The exact day of the patent, often given online as 10 July 1817, was not found on any page opened; Wikipedia and Brewster's treatise give only July 1817, so the day is left out.",
        "No Trove page could be opened to confirm when kaleidoscopes were first advertised in Sydney or Hobart; Trove blocked automated access."
      ],
      "nameNotes": "",
      "confidence": "high",
      "playable": false,
      "realLife": true,
      "kind": "game"
    },
    {
      "id": "tangram",
      "title": "Tangram",
      "era": "1800s",
      "year": 1817,
      "yearLabel": "1817 (Western craze); invented in China earlier",
      "origin": "China; the craze reached Philadelphia and London in 1816 to 1817",
      "blurb": "Seven flat pieces cut from one square can be rearranged into hundreds of shapes, and in 1817 the whole of Europe and America went mad for it.",
      "story": [
        "The tangram is a dissection puzzle. A square is cut into seven pieces: five triangles, a square and a parallelogram. The challenge is to arrange all seven, with no overlaps, to copy a silhouette of a person, animal, boat or letter. The puzzle came from China, where it is called qiqiaoban, which means roughly 'seven boards of skill'. The original Chinese book that introduced it was already reported lost by 1815.",
        "The earliest tangram still in existence was given to a Philadelphia ship owner, Francis Waln, in 1802. In 1815 an American sea captain, M. Donnaldson, bought tangram books while his ship was docked in Canton and carried them home to Philadelphia in February 1816. In London, J. Leuchars registered the first non-Chinese tangram set on 3 February 1817 and sold it in a mahogany box for six shillings and sixpence.",
        "In 1817 and 1818 the puzzle swept Britain, France, Denmark, the United States and other countries, with publishers rushing out books under names such as 'The Fashionable Chinese Puzzle'. A French caricature of 1818 poked fun at people who could not put it down. After the craze faded, about twenty years passed before new tangram books appeared.",
        "The word 'tangram' itself is newer than the craze. Its first known use was in Thomas Hill's 'Geometrical Puzzle for the Young' in 1848, and it entered Webster's American Dictionary in 1864. Boxed sets with a booklet of fifty problems were still being sold in England in the 1840s."
      ],
      "howToPlay": [
        "Start with the seven pieces: two large triangles, one medium triangle, two small triangles, one square and one parallelogram.",
        "Choose a target silhouette, such as a cat, a sailing boat or a running figure.",
        "Arrange all seven pieces, flat and touching, so their outline matches the silhouette. Every piece must be used and none may overlap.",
        "Pieces can be rotated, and the parallelogram can be flipped over.",
        "When you have matched the shape, try to invent a new silhouette for a friend to solve."
      ],
      "didYouKnow": [
        "Only 13 different convex shapes (ones with no dents in their outline) can be made using all seven tangram pieces.",
        "The oldest surviving tangram set was given to a Philadelphia shipping merchant in 1802, before the European craze began.",
        "The first London tangram set of 1817 cost six shillings and sixpence and came with 16 hand-coloured puzzle cards in a mahogany box.",
        "Puzzle makers love tangram 'paradoxes': two figures that look identical except one is missing a foot, yet both use all seven pieces."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Tangram - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tangram",
          "note": "Chinese origin and the name qiqiaoban ('seven boards of skill'), 1802 Waln set, Donnaldson 1815 to 1816, 1818 craze in France and Denmark, name history 1848 and 1864, paradoxes."
        },
        {
          "title": "1817 Tangram Puzzle - Puzzle Museum",
          "url": "https://www.puzzlemuseum.com/month/picm09/2009-03-early-tangram.htm",
          "note": "J. Leuchars of London registered 3 February 1817, box contents and price, 1817 to 1818 craze across Europe and the USA."
        },
        {
          "title": "The fashionable Chinese puzzle - Yale Center for British Art",
          "url": "https://collections.britishart.yale.edu/vufind/Record/3908902",
          "note": "Wallis 1817 edition, boxed set of 1840 to 1850 with 50 problems, twenty-year gap after the 1817 to 1818 craze."
        },
        {
          "title": "Tangram - Wolfram MathWorld",
          "url": "https://mathworld.wolfram.com/Tangram.html",
          "note": "13 convex tangram configurations."
        }
      ],
      "uncertainties": [
        "The exact Chinese invention date is unknown; Wikipedia says about 20 years before 1815, and the Puzzle Museum says late 18th or early 19th century. The year and yearLabel use 1817, the year of the Western craze, so that year, label and blurb agree.",
        "Italy was dropped from the list of countries swept by the craze because no opened page confirms it. A summary of Jerry Slocum's research lists England, France, Switzerland, Italy, the Netherlands, Denmark, Germany and the United States, but that page could not be opened.",
        "Popular claims that Napoleon, Lewis Carroll or Edgar Allan Poe were tangram fans appear in none of the sources opened, so they are left out.",
        "No Trove page could be opened to confirm when tangram sets reached Australia; Trove blocked automated access."
      ],
      "nameNotes": "",
      "confidence": "high",
      "playable": false,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "zoetrope",
      "title": "Zoetrope and Flip Book",
      "era": "1800s",
      "year": 1834,
      "yearLabel": "1834 (daedaleum); sold as the zoetrope from 1867",
      "origin": "William George Horner, England (1834); named and patented by William E. Lincoln, USA (1867); flip book by John Barnes Linnett, England (1868)",
      "blurb": "Spin a slotted drum with a strip of drawings inside and the pictures seem to come alive, decades before the first movies.",
      "story": [
        "A zoetrope is a drum with narrow slits cut around its top edge. A paper strip of drawings, each slightly different, sits around the inside. Spin the drum and look through the slits: the slits chop the view into quick glimpses, so your eye blends the drawings into one moving picture of a galloping horse or a jumping frog.",
        "The English mathematician William George Horner designed it in 1834, after seeing a spinning-disc toy called the phenakistiscope. He named his drum the daedaleum after Daedalus of Greek myth. It was not sold in large numbers until the 1860s. In London, Horne and Thornthwaite were making zoetropes between 1857 and 1866.",
        "An American student, William Ensign Lincoln, perfected the design at about eighteen and coined the name zoetrope, from Greek words meaning 'wheel of life'. He applied for a United States patent on 27 July 1866, assigning it to the games maker Milton Bradley, and it was granted on 23 April 1867. A 'Wheel of Life' set sold in England in the 1870s came with 26 strips, including 'Leap Frog' and 'Base Ball'.",
        "The flip book does the same trick with pages instead of slits. John Barnes Linnett patented it on 18 March 1868 as the kineograph, meaning 'moving picture'. In 1894 Herman Casler put flip book pictures on a turning cylinder in a coin-operated machine called the Mutoscope, a step on the road to cinema."
      ],
      "howToPlay": [
        "Make or print a strip of 12 to 15 drawings, each showing the next tiny step of a movement, such as a figure jumping.",
        "Fit the strip inside the drum, pictures facing inwards, below the slits.",
        "Spin the drum steadily on its stand.",
        "Look through the slits, not over the top, at the pictures on the far side.",
        "To make a flip book, draw the same sequence in the corner of a small pad, one drawing per page, then bend the pages and let them flick past your thumb."
      ],
      "didYouKnow": [
        "The zoetrope name was invented by an American student aged about eighteen, and the patent went to the games maker Milton Bradley.",
        "Horner's original 1834 name, daedaleum, honoured Daedalus, the mythical inventor who built wings to escape Crete.",
        "A Chinese 'trotting horse lamp', known before AD 1000, used hot air from a candle to spin paper figures, though whether it showed true animation is uncertain.",
        "The flip book's 1868 patent name, kineograph, means 'moving picture'."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Zoetrope - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Zoetrope",
          "note": "Horner 1834 daedaleum, Lincoln and Milton Bradley patent dates 1866 to 1867, etymology, Chinese lamps, how it works."
        },
        {
          "title": "Flip book - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Flip_book",
          "note": "Linnett kineograph patent 18 March 1868, Mutoscope 1894, Filoscope 1897."
        },
        {
          "title": "'Wheel of Life' zoetrope set, 1870 to 1880 - V&A Collections",
          "url": "https://collections.vam.ac.uk/item/O1114550/wheel-of-life-zoetrope-set/",
          "note": "English zoetrope set with 26 strips including 'Leap Frog' and 'Base Ball'."
        },
        {
          "title": "V&A collections API search: zoetrope",
          "url": "https://api.vam.ac.uk/v2/objects/search?q=zoetrope&page_size=10",
          "note": "Horne and Thornthwaite zoetrope, London, 1857 to 1866; other 19th-century zoetropes."
        }
      ],
      "uncertainties": [
        "The research brief said zoetropes were sold from the 1860s; the V&A lists a London example dated 1857 to 1866, so sale may have begun slightly earlier.",
        "Museums Victoria holds a zoetrope and strips but its website blocked automated access, so no Australian detail is included.",
        "A Trove search snippet mentioned an 1883 Queensland article on a related 'magic wheel', but the page could not be opened.",
        "Editorial note: the V&A 'Wheel of Life' set also contains strips with racist and anti-Irish titles, so only 'Leap Frog' and 'Base Ball' are named. If images of the set are ever shown on the site, add a line explaining that some Victorian strips used caricatures that are offensive today."
      ],
      "nameNotes": "'Zoetrope' is a generic word today. Avoid 'Wheel of Life', which was a manufacturer's title, and 'Mutoscope', a company name.",
      "confidence": "high",
      "playable": false,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "draughts",
      "title": "Draughts",
      "era": "1800s",
      "year": 1840,
      "yearLabel": "Ancient; world championship from 1840",
      "origin": "Ancient game; the English form was standardised in Scotland and England in the 1800s",
      "blurb": "A Scottish stocking weaver and a farm boy called the Herd Laddie played five matches for prize money in the 1840s and became the first world champions of draughts.",
      "story": [
        "Draughts, called checkers in America, is played on the 64 squares of a chessboard. Each player has twelve round pieces on the dark squares. Pieces slide diagonally forward and capture by jumping over an enemy piece into the empty square beyond. If you can jump, you must. A piece that reaches the far side is crowned a king and can move backwards too.",
        "The game grew out of much older board games. A 10th-century Arab scholar mentioned a game called quirkat, or alquerque, an ancestor of draughts, and the Spanish 'Book of Games' of 1283 gave rules for it. The first English book on draughts was written by William Payne in 1756, with a dedication and preface by the famous dictionary writer Samuel Johnson.",
        "In the 1800s draughts became a craze in Scotland. Andrew Anderson, a stocking weaver from Braidwood, was the best player by the 1820s. His great rival was James Wyllie, nicknamed the Herd Laddie because he had worked for a livestock drover. They played five matches between 1838 and 1847, for stakes of 10 to 130 pounds, and are counted as the first world champions.",
        "Anderson's book of 1852, The Game of Draughts Simplified, fixed the rules and the way moves are written down. Wyllie held the title, with gaps, until 1894 and toured Britain, North America, Australia and New Zealand. By September 1883 he had played 12,386 recorded games and lost only 82 of them. In 1887, aged in his late sixties and going deaf, he arrived in Melbourne and took on all comers. By the time he crossed to New Zealand that September he had played 1,850 games in Australia, winning 1,760, drawing 88 and losing just two."
      ],
      "howToPlay": [
        "Set up a chessboard with a dark square at each player's left. Each player puts twelve pieces on the dark squares of their first three rows.",
        "Take turns moving one piece diagonally forward one square onto an empty dark square.",
        "If an enemy piece is diagonally next to yours with an empty square beyond, jump over it and remove it. You can keep jumping in one turn if more jumps are available.",
        "Jumping is compulsory: if you can capture, you must.",
        "A piece reaching the far row becomes a king (stack a second piece on it). Kings can move and jump backwards as well as forwards.",
        "You win when your opponent has no pieces left or cannot move."
      ],
      "didYouKnow": [
        "The first English draughts book of 1756 had its dedication and preface written by Samuel Johnson, the man who wrote the first great English dictionary.",
        "The 1840 match between Anderson and Wyllie at the Clydesdale Hotel in Lanark was played for 100 pounds, a fortune for a weaver.",
        "By 1883 James Wyllie had played 12,386 recorded games and lost just 82.",
        "On his 1887 tour of Australia, James Wyllie played 1,850 games of draughts and lost only two.",
        "Every men's world champion from 1840 to 1994 came from Scotland, England or the United States."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Checkers (Draughts) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Draughts",
          "note": "Alquerque, 10th-century mention of quirkat with no rules given, 1283 Book of Games, William Payne 1756, general rules."
        },
        {
          "title": "William Payne (mathematician) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/William_Payne_(mathematician)",
          "note": "Payne's 1756 draughts book; Samuel Johnson wrote the dedication and preface."
        },
        {
          "title": "English draughts - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/English_draughts",
          "note": "Board, twelve pieces, mandatory jumps, kings; championship dating to the 1840s; champions from Scotland, England and the USA 1840 to 1994."
        },
        {
          "title": "Andrew Anderson (draughts) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Andrew_Anderson_(draughts)",
          "note": "Born 1799 Braidwood, stocking weaver, five matches with Wyllie 1838 to 1847 with places and stakes, books of 1848 and 1852."
        },
        {
          "title": "World Checkers Championship - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/World_Checkers_Championship",
          "note": "Anderson champion 1840 to 1844 and 1847 to 1849; Wyllie 1844 to 1847, 1849 to 1859, 1864 to 1876, 1878 to 1894; Robert Martins."
        },
        {
          "title": "Ottawa's Checkered Past - Today in Ottawa's History",
          "url": "https://todayinottawashistory.wordpress.com/2020/03/28/ottawas-checkered-past/",
          "note": "Origin of the Herd Laddie nickname, Wyllie's 1883 North American tour, game record of 12,386 games and 82 losses."
        },
        {
          "title": "Master of the black squares - Otago Daily Times (Toitu Otago Settlers Museum feature)",
          "url": "https://www.odt.co.nz/lifestyle/magazine/master-black-squares",
          "note": "Wyllie's tours of the UK, America and Australasia; arrived Melbourne April 1887 in his late 60s and deaf; 506 games there by July; Australian total 1,850 games, 1,760 won, 88 drawn, 2 lost; New Zealand tour from September 1887; the cattle dealer Porteous and the 'herd laddie' nickname."
        }
      ],
      "uncertainties": [
        "The 'Herd Laddie' nickname explanation comes from a local Ottawa history blog citing period newspapers, and is backed by the Otago Daily Times museum feature, which says a cattle dealer named Porteous took Wyllie to Edinburgh as his 'herd laddie'. Wikipedia gives no explanation.",
        "One sceptic's report could not confirm that Wyllie 'toured the world' and the other supplied the Otago Daily Times feature confirming tours of Britain, America and Australasia; the entry now names those places instead.",
        "Trove search snippets gave 15 April 1887 as Wyllie's arrival date in Melbourne and Mather's Cafe in Bourke Street as his venue, but Trove blocked access. The Otago Daily Times confirms only that he arrived in April 1887, so the exact day and venue are not used.",
        "Wikipedia and the James Wyllie article disagree slightly on whether the first championship was 1840; the Anderson article lists an 1838 match as well."
      ],
      "nameNotes": "Use 'draughts' (Australian and British); 'checkers' is the American name. Neither is a trademark.",
      "confidence": "high",
      "playable": false,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "conkers",
      "title": "Conkers",
      "era": "1800s",
      "year": 1848,
      "yearLabel": "First recorded with horse chestnuts 1848",
      "origin": "England; first recorded game with horse chestnuts on the Isle of Wight, 1848",
      "blurb": "Thread a shiny horse chestnut on a string and take turns smashing it against your friend's until one of them breaks.",
      "story": [
        "Horse chestnut trees are not native to Britain. They grow wild in the mountains of the Balkans, were unknown to botanists until the 1590s, and were planted in Britain from 1616, dropping shiny brown seeds every autumn. But the first version of the game did not use them at all. The poet Robert Southey, in a long letter about his childhood written in 1821 and 1822 and published after his death, remembered a schoolboy game of the early 1780s at Corston near Bath: snail shells were pressed point to point until the weaker one broke, which was called \"conquering\". Other children played the same game with hazelnuts, and some called it \"conquerors\".",
        "The first recorded game of conkers with horse chestnuts was on the Isle of Wight in 1848, and from the 1850s chestnuts took over in many regions. In 1894 Alice Gomme printed the rhymes children shouted to claim first strike, such as \"Obbly, obbly onkers, my first conquers\" and \"Cobblety cuts, put down your nuts\". A conker that beats one opponent becomes a one-er, then a two-er, and so on.",
        "In 1965 a group of anglers at the Chequered Skipper pub in Ashton, Northamptonshire, held a conker contest because the weather was too bad for fishing. It became the World Conker Championships, which has raised more than £420,000 for charities that help blind and visually impaired people. Players must use conkers supplied by the organisers so nobody can secretly harden their own.",
        "Conkers has had plenty of trouble. A 2000 survey by Keele University found many British schools banning it, worried about injuries or lawsuits, and in 2004 some schools banned it over nut allergies, even though health advisers said conkers were not a known danger. In 2024 the championship winner was accused of using a steel conker, and was cleared."
      ],
      "howToPlay": [
        "Find a hard, round horse chestnut. Ask an adult to drill or skewer a hole through it, then thread a string or shoelace through and tie a big knot underneath.",
        "Each player wraps the string around a hand and lets the conker hang about 20 centimetres below the knuckles.",
        "Decide who strikes first (toss a coin or shout the rhyme). The other player holds their conker still at arm's length. Stand well apart and keep your free hand and face clear of the swing.",
        "The striker swings their conker down hard to hit the hanging one. If they miss, they may try again; many rules give three strikes, then players swap.",
        "Keep taking turns until one conker breaks off its string. The winner's conker becomes a one-er. Beat another and it is a two-er.",
        "Baking, soaking in vinegar or painting with varnish to harden a conker is usually counted as cheating."
      ],
      "didYouKnow": [
        "Before horse chestnuts, children in the 1780s played the game with snail shells, and later with hazelnuts.",
        "The World Conker Championships started in 1965 when some anglers in Ashton could not go fishing because of bad weather.",
        "In 2024 the championship winner was accused of using a steel conker; he was cleared.",
        "Horse chestnut trees come from the Balkans and were only planted in Britain from the early 1600s."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Wikipedia: Conkers",
          "url": "https://en.wikipedia.org/wiki/Conkers",
          "note": "Southey's recollection of snail shells and hazelnuts, Isle of Wight 1848 citing Opie 1969, name origin, scoring one-er/two-er, hardening as cheating, 2000 Keele survey, 2004 allergy bans, 2024 steel conker"
        },
        {
          "title": "Southey to John May, 28 December 1821 to 21 April 1822 (The Collected Letters of Robert Southey, Part Six, letter 3772)",
          "url": "https://cha.artsci.tamu.edu/SoutheyLetters/HTML/Part_Six/southey.6.3772.html",
          "note": "Autobiographical letter: at Corston school the game \"was performed with snail shells, by placing them against each other, point to point, and pressing till the weaker was broken in; that was called conquering\""
        },
        {
          "title": "Keele University Arboretum: Horse chestnut",
          "url": "https://www.keele.ac.uk/arboretum/ourtrees/speciesaccounts/horse-chestnut/",
          "note": "Tree unknown to botanists until around 1596, found where Greece, Albania and the former Yugoslavia meet; introduced to the UK in 1616"
        },
        {
          "title": "Woodland Trust: Horse chestnut",
          "url": "https://www.woodlandtrust.org.uk/trees-woods-and-wildlife/british-trees/a-z-of-british-trees/horse-chestnut/",
          "note": "First record of the game Isle of Wight 1848; says the tree was introduced from Turkey in the late 16th century (see uncertainties)"
        },
        {
          "title": "Gomme, The Traditional Games of England, Scotland and Ireland, vol. 1 (1894), entries Conkers and Conquerors",
          "url": "https://archive.org/download/traditionalgames01gomm/traditionalgames01gomm_djvu.txt",
          "note": "Regional first-strike rhymes (\"Obbly, obbly onkers\", \"Cobblety cuts\" played with small nuts) and note that the game was also \"playing at snail-shells\""
        },
        {
          "title": "Wikipedia: World Conker Championships",
          "url": "https://en.wikipedia.org/wiki/World_Conker_Championships",
          "note": "Founded 1965 at the Chequered Skipper, Ashton; three alternate strikes; 20 cm of lace; conkers supplied by organisers; over £420,000 raised for charities supporting the visually impaired"
        }
      ],
      "uncertainties": [
        "Sources disagree on how the horse chestnut reached Britain: the Woodland Trust says from Turkey in the late 1500s, while Keele University Arboretum says it was discovered in the Balkans around 1596 and introduced to Britain in 1616, and Wikipedia restricts its native range to the Balkans. Keele's dates are used.",
        "Southey's recollection is in a letter to John May written between 28 December 1821 and 21 April 1822 and published by his son in 1849 to 1850, not in memoirs published in 1821 as Wikipedia implies. The letter mentions snail shells only; the hazelnut version comes from Wikipedia and from Gomme's \"Cobblety cuts\" played with small nuts.",
        "The two sceptics' reports differed on the date of Southey's snail-shell game: one dated it to the early 1780s from his time at Corston school (1781 to 1782), the other preferred \"late 1700s\". The letter's Corston setting supports the early 1780s, but Southey does not give a year, so treat the decade as approximate.",
        "The 1848 Isle of Wight record comes from Iona and Peter Opie's 1969 book as cited by Wikipedia and the Woodland Trust; the Opie page itself (Google Books) could not be opened because of a captcha.",
        "No Australian reference to conkers could be found in any page opened; horse chestnuts are far less common in Australia than in Britain, so this entry has no Australian anecdote."
      ],
      "nameNotes": "",
      "confidence": "high",
      "playable": false,
      "realLife": true,
      "kind": "game"
    },
    {
      "id": "happy-families",
      "title": "Happy Families",
      "era": "1800s",
      "year": 1851,
      "yearLabel": "1851",
      "origin": "John Jaques of London, England",
      "blurb": "Collect Mr Bun the Baker, Mrs Bun, Master Bun and Miss Bun, and ten other comically drawn families, by asking your rivals for the cards you need.",
      "story": [
        "Happy Families is a card game of asking and collecting. The pack has eleven families of four: a father, mother, son and daughter, each named for the father's trade. There is Bun the Baker, Bones the Butcher, Chip the Carpenter, Soot the Sweep and Dose the Doctor. Players ask each other for cards and try to complete whole families.",
        "The game was devised by John Jaques junior of the London games firm Jaques, and was shown at the Great Exhibition of 1851, the huge display of inventions held in the Crystal Palace in Hyde Park. It was an instant success. The same firm made the Staunton chess set in 1849 and later published Snap, Tiddledy Winks and Ludo.",
        "The cards were drawn as grotesque caricatures. They are usually attributed to John Tenniel, who later drew the famous pictures for Alice in Wonderland in 1865, but the cards carried no artist's credit, so nobody is completely certain. An earlier game called Doctor Busby, from about 1840, may have given Jaques the idea.",
        "Happy Families quickly inspired copies in other countries. In France a 'Game of Seven Families' appeared in 1876, and German makers produced 'Quartett' games. Jaques still publishes the game today."
      ],
      "howToPlay": [
        "Deal all 44 cards out to the players.",
        "On your turn, ask one other player for a specific card you need, for example 'Please may I have Master Bun, the Baker's son?' You must already hold a card from that family.",
        "If the player has it, they must hand it over and you may ask again, anyone you like.",
        "If they do not have it, your turn ends and the player you asked goes next.",
        "When you hold all four members of a family, lay them face down in front of you.",
        "When all families are complete, the player with the most families wins."
      ],
      "didYouKnow": [
        "Happy Families was displayed at the Great Exhibition of 1851, where six million people visited the Crystal Palace.",
        "The pictures are credited to John Tenniel, the Alice in Wonderland artist, but the cards never carried his name.",
        "A French version with seven families was drawn in 1876 by the cartoonist André Gill."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Happy Families - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Happy_Families",
          "note": "John Jaques junior, published before the Great Exhibition of 1851, Tenniel attribution with no official credit, the eleven family names, rules."
        },
        {
          "title": "Happy Families - The World of Playing Cards",
          "url": "https://www.wopc.co.uk/games/happy-families",
          "note": "Published 1851 and shown at the Great Exhibition, instant success, eleven families of four, Doctor Busby c. 1840, French 1876 version by André Gill, German Quartett."
        },
        {
          "title": "Jaques of London - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Jaques_of_London",
          "note": "Firm founded 1795, Staunton chess set 1849, Happy Families 1851, later games."
        },
        {
          "title": "Happy Families: The Card Game Jaques Invented - Jaques London blog",
          "url": "https://www.jaqueslondon.co.uk/blogs/posts/happy-families-the-card-game-jaques-invented",
          "note": "Company account: 44 cards, 11 families, Mr Bun the Baker family, asking rules, c. 1851 and the Great Exhibition. Company source, used only for details that match other sources."
        },
        {
          "title": "Great Exhibition - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Great_Exhibition",
          "note": "Six million visitors, Crystal Palace, Hyde Park, 1 May to 15 October 1851."
        }
      ],
      "uncertainties": [
        "The Tenniel attribution is traditional but unproven; Wikipedia says 'possibly' and notes there was no official credit, while the World of Playing Cards states it as fact.",
        "No Australian evidence was opened; Trove blocked automated access."
      ],
      "nameNotes": "Happy Families is a generic game name, but 'Jaques' Original Happy Families' is a product of Jaques of London; use the plain name.",
      "confidence": "high",
      "playable": false,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "noughts-and-crosses",
      "title": "Noughts and Crosses",
      "era": "1800s",
      "year": 1858,
      "yearLabel": "Ancient; name first recorded 1858",
      "origin": "Ancient; the name is English, first printed in 1858",
      "blurb": "Three-in-a-row games are said to go back to ancient Egypt and Rome, but the name noughts and crosses was not printed until 1858.",
      "story": [
        "Noughts and crosses is the simplest strategy game of all. Two players take turns marking a nought (O) or a cross (X) on a three-by-three grid. The first to get three in a row, across, down or diagonally, wins. If the grid fills with no line, the game is a draw, which Americans call a 'cat's game'.",
        "Three-in-a-row games are thought to be very old. Boards are said to have been found scratched on roofing tiles in Egypt from around 1300 BC, though the evidence is thin. The Roman poet Ovid wrote two lines about a game on 'a small board' where each player had three pebbles and won by getting them in a row, and the Romans are said to have called it terni lapilli, 'three pebbles at a time'.",
        "The British name first appeared in print on 11 September 1858, when a reader of the magazine Notes and Queries, Thomas Knight, quoted Ovid's lines and wrote that they described a game he had often played as a schoolboy. Its name in Ireland was Tip-top-Castle, while 'the only name for it among English schoolboys that I have been able to learn is Noughts and Crosses'. Two months later, on 27 November 1858, another contributor, A. De Morgan, recalled 'the common game which in my school days used to be called by some noughts and crosses, and by others tit-tat-toe'. The American spelling 'tick-tack-toe' was printed in 1884, though it first meant a different game played with a pencil and a slate.",
        "Victorian schoolchildren played it on slates and in the margins of their books. In 1952 it became one of the first ever video games, when Sandy Douglas programmed OXO on the EDSAC computer at Cambridge, and the machine could play a perfect game."
      ],
      "howToPlay": [
        "Players take turns marking a square with O or X.",
        "Three of your marks in a row, column or diagonal wins.",
        "If all nine squares fill with no line, it is a draw."
      ],
      "didYouKnow": [
        "Counting rotations and reflections as the same, there are only 765 different board positions and 26,830 possible games.",
        "Game boards for three in a row are said to have been found on Egyptian roofing tiles from about 1300 BC.",
        "A 1952 Cambridge computer called OXO played noughts and crosses perfectly, making it one of the first video games.",
        "In 1858 a magazine reader reported that Irish schoolboys called the game Tip-top-Castle, while English schoolboys called it noughts and crosses."
      ],
      "computer": "On the hardest setting the computer looks ahead at every possible game (minimax), so it never loses. On easy it plays at random.",
      "sources": [
        {
          "title": "Tic-tac-toe - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tic-tac-toe",
          "note": "Egyptian roof tiles c. 1300 BC, Roman terni lapilli, Notes and Queries 1858, tick-tack-toe 1884, OXO 1952, counts of positions and games."
        },
        {
          "title": "Notes and Queries, 11 September 1858, page 202 (scan on Internet Archive)",
          "url": "https://archive.org/download/sim_notes-and-queries_1858-09-11_6_141/sim_notes-and-queries_1858-09-11_6_141_djvu.txt",
          "note": "Thomas Knight's letter quoting Ovid's Art of Love iii. 365 ('Parva tabella capit ternos utrimque lapillos') and giving the names Tip-top-Castle (Ireland) and Noughts and Crosses (England): the earliest printed use found."
        },
        {
          "title": "Notes and Queries, Series 2, Volume 6 (1858), page scan - Wikisource",
          "url": "https://en.wikisource.org/wiki/Page:Notes_and_Queries_-_Series_2_-_Volume_6.djvu/441",
          "note": "'Chess Calculus' letter signed A. De Morgan, issue dated 27 November 1858: 'the common game which in my school days used to be called by some noughts and crosses, and by others tit-tat-toe'."
        },
        {
          "title": "The Many Names of Tic-Tac-Toe - Coolmath Games blog",
          "url": "https://www.coolmathgames.com/blog/the-many-names-of-tic-tac-toe/nav",
          "note": "Secondary; correctly gives Notes and Queries, 11 September 1858, as the first printed use of 'noughts and crosses'."
        }
      ],
      "uncertainties": [
        "The two sceptics' reports disagreed about which 1858 text was the first printed use, one citing Thomas Knight's letter of 11 September and the other the 'tit-tat-toe' sentence. Both pages were opened: Knight's letter (page 202, 11 September 1858) is the earliest, and the 'tit-tat-toe' sentence is in A. De Morgan's 'Chess Calculus' letter of 27 November 1858 in the same volume. The research brief's date of 1864 is not supported.",
        "'A. De Morgan' is presumably the mathematician Augustus De Morgan, a frequent contributor to the magazine, but the letter carries only his signature, so the entry does not name him further.",
        "The 1884 'tick-tack-toe' date is from Wikipedia only, and that early use may refer to a different slate game.",
        "The ancient Egyptian roof-tile claim and the name terni lapilli rest on Wikipedia alone; the original archaeological reports were not opened. Ovid's lines are confirmed only as quoted in the 1858 letter.",
        "No Australian evidence was opened; Trove blocked automated access."
      ],
      "nameNotes": "Use 'noughts and crosses' (Australian and British) rather than 'tic-tac-toe'; neither is a trademark. Avoid 'Tic Tac' alone, which is a confectionery brand.",
      "confidence": "high",
      "playable": true,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "snap",
      "title": "Snap",
      "era": "1800s",
      "year": 1866,
      "yearLabel": "1866",
      "origin": "John Jaques and Son, London, England",
      "blurb": "Turn over cards one at a time and be the first to yell 'Snap!' when two matching pictures appear, because the quickest shout wins the pile.",
      "story": [
        "Snap is a game of fast eyes and loud voices. Players turn cards face up one after another. The moment two matching cards show at the same time, the first player to shout 'Snap!' wins both piles. The game ends when one player holds all the cards.",
        "John Jaques and Son of London published 'Snap, the Old Original Game' in 1866, fifteen years after their Happy Families. The pack had 64 cards of 'grotesque characters', in 16 sets of four. The earliest sets are said to have been coloured by hand, and later ones were printed in colour. The World of Playing Cards credits the drawings to John Tenniel, made at about the same time as his Alice in Wonderland pictures.",
        "Snap may be a simpler version of an older game called Snip Snap Snorem. The Victoria and Albert Museum notes that the rules we use today were called 'Easy Snap' in the 1800s and were thought best for very young children. The usual Victorian way was for each player to turn cards up onto their own separate pile. There was also 'Speed Snap', where everyone turned a card over at the same time.",
        "Snap has been printed in countless editions since, and can be played with any ordinary pack of 52 cards. In Germany and Austria it is known as Schnipp-Schnapp."
      ],
      "howToPlay": [
        "Deal all the cards face down so every player has a pile. Do not look at them.",
        "Take turns turning your top card face up onto a pile in front of you (or onto one shared pile in the centre).",
        "Keep watching all the face-up piles. When two top cards match, shout 'Snap!'",
        "The first to shout takes both matching piles and puts them under their own pile.",
        "If you shout 'Snap!' by mistake, your face-up pile goes to the middle as a 'snap pool' that anyone can win later.",
        "Players with no cards left are out. The last player holding cards wins."
      ],
      "didYouKnow": [
        "The 1866 Jaques pack had 64 picture cards of 'grotesque characters', not ordinary playing cards, and the earliest sets are said to have been coloured by hand.",
        "In 'Animal Snap' each player is given an animal and must shout the other player's animal, not 'Snap', to win the pile.",
        "Snap is called Schnipp-Schnapp in Germany and Austria."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Snap - The World of Playing Cards (Jaques)",
          "url": "https://www.wopc.co.uk/uk/jaques/snap",
          "note": "First published 1866 by John Jaques and Son, 64 cards of 'grotesque characters', earlier sets hand coloured, Tenniel attribution, later editions."
        },
        {
          "title": "Snap card game, John Jaques and Son - V&A Collections",
          "url": "https://collections.vam.ac.uk/item/O26667/snap-card-game-john-jaques",
          "note": "Jaques introduced Snap in 1866; 64 cards in 16 sets of four; today's rules were known as 'Easy Snap' in the 19th century, the usual way then being separate piles; Speed Snap. The V&A's own copy is a boxed chromolithographed edition of about 1930."
        },
        {
          "title": "Rules of Card Games: Snap - pagat.com",
          "url": "https://www.pagat.com/war/snap.html",
          "note": "Detailed rules, snap pool, Animal Snap variant, link to Snip Snap Snorum."
        },
        {
          "title": "Snap (card game) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Snap_(card_game)",
          "note": "Snip Snap Snorem link, German names, variants."
        }
      ],
      "uncertainties": [
        "The Tenniel attribution for the Snap cards rests on the World of Playing Cards and dealer descriptions; no signed credit is recorded.",
        "Whether the 1866 pack was hand coloured rests on the World of Playing Cards alone, which says 'the earlier sets were hand coloured' while the box title reads 'Printed in Colours'. The V&A's copy is a chromolithographed edition of about 1930, so it cannot settle the point; one sceptic's report treated it as the 1866 pack.",
        "Pagat.com says Snap emerged 'towards the end of the 19th century', slightly later than the 1866 Jaques publication documented by the V&A.",
        "No Australian evidence was opened."
      ],
      "nameNotes": "'Snap' is a generic game name; 'Jaques' Original Snap' is a Jaques of London product.",
      "confidence": "high",
      "playable": false,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "fifteen-puzzle",
      "title": "The Fifteen Puzzle",
      "era": "1880s",
      "year": 1880,
      "yearLabel": "1880 craze (precursor c. 1874)",
      "origin": "Noyes Palmer Chapman, Canastota, New York, USA",
      "blurb": "Slide fifteen numbered tiles around a little tray until they sit in order, a puzzle that sent America and then Europe into a frenzy in 1880.",
      "story": [
        "Noyes Palmer Chapman, the postmaster of Canastota in New York State, is said to have shown friends a puzzle of sixteen numbered blocks as early as 1874. His son carried copies to Syracuse, and it travelled on to Hartford, Connecticut, where students at the American School for the Deaf began making it. By December 1879 a Boston woodworker, Matthias Rice, was selling it as the Gem Puzzle.",
        "In late January 1880 a Worcester dentist, Charles Pevey, offered a cash reward for a solution, and the puzzle became a craze across the United States. It reached Europe in April 1880 and had burnt out by July. Newspapers in February and March 1880 printed notes, articles and poems joking that the puzzle was driving people mad. Papers of the time made jokes about mental illness and asylums that we would not make today.",
        "Here is the catch: exactly half of all starting positions can never be solved. Two mathematicians, Johnson and Story, proved this in 1879. They showed that every arrangement of the tiles can be labelled odd or even, that no amount of sliding can change that label, and that only one kind can ever reach the finished picture. During the 1880 craze, prizes of up to 1000 dollars were already being offered to anyone who could swap only the 14 and 15 tiles and finish. Years later the puzzle writer Sam Loyd repeated the 1000 dollar offer, knowing it was impossible.",
        "Loyd also claimed from 1891 until his death in 1911 that he had invented the puzzle. He had nothing to do with it; his first article about it appeared in 1886, well after the craze. Chapman's own patent application of February 1880 was rejected, probably because it was too similar to an earlier puzzle-blocks patent."
      ],
      "howToPlay": [
        "Tap or click a tile next to the gap to slide it.",
        "Put the tiles in order from 1 to 15, with the gap in the bottom right corner.",
        "Fewer moves is better."
      ],
      "didYouKnow": [
        "Chapman applied for a patent on 21 February 1880, but it was rejected, probably because it was too similar to an 1878 Puzzle-Blocks patent.",
        "Exactly half of all possible tile arrangements can never be solved, as Johnson and Story proved in 1879.",
        "In March 1880 the magazine Puck printed a cartoon called The Great Presidential Puzzle, showing Senator Roscoe Conkling sliding blocks with the heads of Republican presidential hopefuls such as Grant and Blaine.",
        "The 1000 dollar prizes offered in 1880 for the impossible 14-15 swap would be worth roughly 35,000 US dollars today."
      ],
      "computer": "The puzzle shuffles by making real moves from the solved position, so every puzzle it gives you can be solved. Half of all arrangements of the tiles can never be solved; the famous 14-15 swap is one of them.",
      "sources": [
        {
          "title": "15 puzzle, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/15_puzzle",
          "note": "Chapman, Rice, Pevey, patent application 21 February 1880 rejected 'likely because' of Kinsey's 1878 patent, Loyd's false claim 1891 to 1911 and first article 1886, $1000 prize equivalent to $35,833 in 2025, Johnson and Story 1879."
        },
        {
          "title": "15 Puzzle, Wolfram MathWorld",
          "url": "https://mathworld.wolfram.com/15Puzzle.html",
          "note": "Craze January to July 1880 in US and Europe from April; patent application given as March 1880; Loyd's 20-year campaign of false claims."
        },
        {
          "title": "Fifteen Puzzle, J. A. Storer puzzle collection",
          "url": "https://www.cs.brandeis.edu/~storer/JimPuzzles/ZPAGES/zzzFifteen.html",
          "note": "Rice's 1 March 1880 Boston Herald interview, 75 cents price, 1880 newspaper jokes about asylums."
        },
        {
          "title": "Sam Loyd's Fifteen, the history of the puzzle, Cut the Knot",
          "url": "https://www.cut-the-knot.org/pythagoras/history15.shtml",
          "note": "Loyd's $1000 reward proposal and the puzzle's spread to Europe."
        },
        {
          "title": "The Fifteen Puzzle, Jaap's Puzzle Page",
          "url": "https://www.jaapsch.net/puzzles/fifteen.htm",
          "note": "Prizes as high as $1000 for the 14-15 swap were offered during the 1880 craze; Loyd neither invented the puzzle nor was first to offer the prize (summarising Slocum and Sonneveld)."
        },
        {
          "title": "The Great Presidential Puzzle, J. A. Wales, Puck, 17 March 1880, Wikimedia Commons",
          "url": "https://commons.wikimedia.org/wiki/File:The_great_presidential_puzzle,_political_cartoon_by_James_Albert_Wales,_1880.jpg",
          "note": "Puck vol. 7 no. 158, 17 March 1880; Senator Roscoe Conkling with blocks bearing the heads of Grant, Sherman, Blaine and others."
        }
      ],
      "uncertainties": [
        "The 1874 date for Chapman's precursor rests on later recollections (Wikipedia says he 'is said to have shown friends').",
        "The exact date Loyd first made his own 1000 dollar offer is not stated in the sources opened. Jaap Scherphuis's page, summarising Slocum and Sonneveld, says prizes as high as 1000 dollars were already offered during the 1880 craze and that Loyd was not the first to offer one, so the entry no longer credits Loyd with the idea.",
        "Wikipedia, citing Slocum and Sonneveld, dates Chapman's patent application 21 February 1880; MathWorld says March 1880. The February date is used because Wikipedia cites the research directly.",
        "The reason for the patent rejection (similarity to Kinsey's 1878 Puzzle-Blocks patent) is given by Wikipedia as 'likely', so it is worded here as probable.",
        "The 35,000 dollar figure is Wikipedia's inflation estimate (1000 dollars equivalent to 35,833 dollars in 2025); it does not state which base year it uses.",
        "Trove, Papers Past, Museums Victoria and the Powerhouse collection were all blocked by anti-bot protection, so the puzzle's arrival in Australia could not be confirmed."
      ],
      "nameNotes": "The 1879 trade name was Gem Puzzle. Fifteen Puzzle and 15 Puzzle are generic. Do not credit Sam Loyd as inventor.",
      "confidence": "high",
      "playable": true,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "halma",
      "title": "Halma",
      "era": "1880s",
      "year": 1883,
      "yearLabel": "1883 to 1884",
      "origin": "George Howard Monks, Boston, USA",
      "blurb": "Hop your army of pieces across a big 16 by 16 board into the opposite corner before your rival's pieces fill up yours.",
      "story": [
        "Halma was invented in 1883 or 1884 by George Howard Monks, a young Boston doctor who later became a surgeon and taught at Harvard Medical School. His brother Robert came across an English game called Hoppity while in England and described it to him. A mathematician and preacher, Thomas Hill, who had been president of Harvard from 1862 to 1868, is said to have helped develop the game and to have chosen its name, from the Greek word for 'leap'.",
        "E. I. Horsman of New York published Halma in 1885, and Monks received a United States patent in May 1888. The rival firm Milton Bradley also claimed the rights, but lost out or backed down, and sold a near copy called Eckha instead. In England F. H. Ayres printed rules in 1889 and Spears was making sets by July 1893. The game was popular in both Europe and America by the end of the century.",
        "In 1892 the German firm Ravensburger published a six-pointed star version called Stern-Halma. When the American firm Pressman brought out a version in 1928, first as Hop Ching Checkers and then as Chinese Chequers (spelled Chinese Checkers in the United States), the name was a marketing idea. The game comes from Germany, not China. Monks went on to become surgeon-in-chief at Boston City Hospital in 1910."
      ],
      "howToPlay": [
        "Set up a 16 by 16 board. Two players each fill a corner camp with 19 pieces; four players use 13 pieces each.",
        "On your turn, either move one piece a single square in any direction to an empty square,",
        "or jump over any adjacent piece (yours or your opponent's) into the empty square directly beyond it, and keep jumping with that piece as long as you can.",
        "Nothing is ever captured; jumped pieces stay on the board.",
        "Once a piece reaches the opposite camp it may not leave.",
        "The first player to fill the opposite camp with all their own pieces wins."
      ],
      "didYouKnow": [
        "Halma is Greek for 'leap'. Thomas Hill, a mathematician and clergyman who had been president of Harvard from 1862 to 1868, is said to have chosen the name.",
        "Milton Bradley also claimed the rights to Halma, lost out, and brought out a near copy called Eckha instead.",
        "Chinese Chequers (Chinese Checkers in the United States) is Halma on a star-shaped board, first sold in Germany in 1892 as Stern-Halma.",
        "Monks also invented a game called Basilinda, but it never matched Halma's success."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Halma, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Halma",
          "note": "Invention 1883 or 1884, Hoppity, rules, 19 and 13 pieces, Stern-Halma 1892."
        },
        {
          "title": "George Howard Monks, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/George_Howard_Monks",
          "note": "Graduated Harvard Medical School 1880, four-year internship in European medical centres, began surgery in Boston 1884, Harvard Medical School from 1886, Halma 1883 with Thomas Hill, Basilinda, surgeon-in-chief 1910."
        },
        {
          "title": "Thomas Hill (clergyman), Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Thomas_Hill_(clergyman)",
          "note": "Unitarian clergyman, mathematician and educator; president of Harvard 1862 to 1868."
        },
        {
          "title": "Halma, Chinese Checkers: Online Guide, Traditional Games",
          "url": "https://www.tradgames.org.uk/games/Halma.htm",
          "note": "Robert Monks described Hoppity after a trip to England, patent 383,653 filed 14 December 1887 and issued May 1888, Horsman board 'Copyrighted 1885', Ayres 1889, Milton Bradley 'lost the war' and published Eckha."
        },
        {
          "title": "Halma and Chinese Checkers History, chinesecheckers.vegard2.net",
          "url": "https://chinesecheckers.vegard2.net/history.html",
          "note": "Robert Monks wrote from England, Hill 'apparently helped' and named the game, Horsman 1885, Spears July 1893, Ravensburger 1892, Hop Ching Checkers 1928, Milton Bradley 'either lost the battle or backed down'."
        },
        {
          "title": "Chinese checkers, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Chinese_checkers",
          "note": "Invented in Germany 1892 as Stern-Halma; name 'Chinese checkers' a 1928 marketing scheme by Bill and Jack Pressman, originally Hop Ching checkers; UK spelling Chinese chequers."
        },
        {
          "title": "Board game: Halma, E. I. Horsman and Co., Google Arts and Culture (The Strong)",
          "url": "https://artsandculture.google.com/asset/board-game-halma-e-i-horsman-co/5AHzBK36M5l5Sg?hl=en",
          "note": "Strong Museum object; copyright 1885, patent 1888, popularity in Europe and America."
        }
      ],
      "uncertainties": [
        "Sources differ on whether Monks invented the game in 1883 or 1884, and on whether Robert Monks visited England and described Hoppity in person (tradgames) or wrote a letter (vegard2).",
        "Monks's own Wikipedia page says he invented Halma in 1883 during four years of medical training in Europe, which sits awkwardly with the story that his brother reported Hoppity to him from England; the entry keeps the brother story as the one given by the game-history sources.",
        "Thomas Hill's part is hedged in every source opened ('it seems', 'apparently'), so it is given as 'is said to'. Both sceptic reports agree his Harvard presidency (1862 to 1868) came before Halma, not after.",
        "No source opened documents a court case between Milton Bradley and Horsman; one says Milton Bradley 'lost the war', another that it 'either lost the battle or backed down'.",
        "Wikipedia dates Hoppity to 1854 but this was not confirmed elsewhere.",
        "No Australian evidence could be opened (Trove and museum collection sites blocked)."
      ],
      "nameNotes": "Halma is a generic name. Chinese Chequers (Chinese Checkers in the United States) is a later variant; Hop Ching Checkers (1928) was a Pressman brand name.",
      "confidence": "medium",
      "playable": false,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "reversi",
      "title": "Reversi",
      "era": "1880s",
      "year": 1883,
      "yearLabel": "1883 (first reliable mention 1886)",
      "origin": "Lewis Waterman or John W. Mollett, London, England",
      "blurb": "Trap your opponent's discs between two of yours and flip them to your colour, in a game two Englishmen each swore they had invented.",
      "story": [
        "Reversi appeared in England in 1883. Two men, Lewis Waterman and John W. Mollett, both claimed to have invented it, and each called the other a fraud. Mollett had earlier sold a similar game called Annexation, and the dispute was never settled. The first reliable mention of Reversi in print is in The Saturday Review of 21 August 1886.",
        "The game became very popular in England at the end of the 1800s. The London games firm Jaques and Son published Walter Peel's Handbook of Reversi in 1888. That year Waterman won a court case over the name against a rival maker, but on appeal the judges ruled that the word Reversi simply described the game and should never have been registered as a trademark. In 1893 the German firm Ravensburger made it one of its first games. An 1895 New York Times article called it 'something like Go Bang, played with 64 pieces'.",
        "In the original game the board starts empty. Each player places two discs in the four centre squares before any capturing begins, so the opening can vary. The modern version called Othello, patented in Japan by Goro Hasegawa in 1971 and launched by Tsukuda Original in April 1973, fixes those four discs in a set pattern instead."
      ],
      "howToPlay": [
        "Each player has discs of one colour. In the 1883 rules the first four discs are placed in the centre square by the players in turn, in any arrangement.",
        "A move must trap one or more enemy discs in a straight line between the new disc and one of yours. The trapped discs flip.",
        "If you cannot move, you pass. When neither player can move, the player with more discs wins."
      ],
      "didYouKnow": [
        "Ravensburger began producing Reversi in 1893 as one of its very first titles.",
        "Lewis Waterman registered the word Reversi as a trademark in 1887 and sued rival maker F. H. Ayres over a game called Annex, but lost on appeal because the court decided Reversi just described the game.",
        "In 2023 a computer scientist reported that, starting from Othello's fixed four-disc opening, perfect play on the 8 by 8 board ends in a draw.",
        "Two 18th-century European books may describe an earlier version of the game, but nobody has proved the link."
      ],
      "computer": "The computer scores every legal move: corners are worth a lot, squares next to corners are risky, and flipping more discs is good. It picks the best score. A thoughtful kid can beat it.",
      "sources": [
        {
          "title": "Reversi, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Reversi",
          "note": "Waterman and Mollett dispute (flagged citation needed), Saturday Review 1886, Ravensburger 1893, NYT 1895, historical empty-board opening, Othello 1971 and late April 1973 launch, trademark ownership, 8 by 8 draw 'according to an arXiv paper' (Takizawa 2023)."
        },
        {
          "title": "Historia del reversi, El Reversista",
          "url": "https://sites.google.com/site/elreversista/historia",
          "note": "Annexation, 1887 registration, Waterman v Ayres (Annex) injunction September 1888 and reversal on appeal as descriptive, Peel's Handbook of Reversi published by Jaques 1888, original placement rule."
        },
        {
          "title": "History of Reversi and Othello, Rare Pike",
          "url": "https://rarepike.com/reversi/history/",
          "note": "1883 London rules, Victorian fad, decline, Othello rebranding, 1977 world championship, 2023 weak solution."
        },
        {
          "title": "Waterman v Ayres (1888) 57 LJ Ch 893, as cited in a later trade mark judgment, Indian Kanoon",
          "url": "https://indiankanoon.org/doc/1696275/?type=print",
          "note": "Court of Appeal (Cotton LJ) held that 'reversi', applied to a game of reversing the opponent's counters, was not a 'fancy word' eligible for registration."
        }
      ],
      "uncertainties": [
        "The inventor is genuinely disputed; Wikipedia flags the Waterman and Mollett claim as needing a citation, so the 1883 date is only as reliable as that page.",
        "The 1888 Jaques handbook and the 1887 trademark registration come from a secondary Spanish-language history site, not a primary document.",
        "The appeal result (Reversi ruled too descriptive to be a trademark) comes from the El Reversista page, supported by a later Indian trade mark judgment that cites Waterman v Ayres (57 LJ Ch 893) for the ruling that Reversi was not a 'fancy word'. No primary English court report was opened.",
        "Report A described Jaques and Son as the firm that sold Waterman's version; the El Reversista page only says Jaques published Peel's handbook, so that is all the entry claims.",
        "The 2023 draw result is from an arXiv preprint (Takizawa, 'Othello is Solved') cited by Wikipedia, and it applies to the Othello opening, not to the historical empty-centre start shown on this site.",
        "No Australian newspaper evidence could be opened (Trove blocked)."
      ],
      "nameNotes": "Othello is a registered trademark (Kabushiki Kaisha Othello in Japan, MegaHouse elsewhere). Use Reversi, and show the historical empty-centre opening rather than the fixed Othello start.",
      "confidence": "medium",
      "playable": true,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "tiddlywinks",
      "title": "Tiddlywinks",
      "era": "1880s",
      "year": 1888,
      "yearLabel": "1888 (patent filed); craze 1889 to 1890",
      "origin": "Joseph Assheton Fincher, London, England",
      "blurb": "Press a big counter on the edge of a small one so it jumps into a cup, the parlour craze that grown-ups went wild for in 1890.",
      "story": [
        "Joseph Assheton Fincher, a London bank clerk in his mid twenties, filed a patent for 'a new and improved game' on 8 November 1888. He applied for the trademark Tiddledy-Winks on 29 January 1889, and it was approved on 15 May 1889. The patent followed on 19 October 1889. The games firm John Jaques and Son became the only official seller.",
        "The game spread fast. Rival makers rushed out copies called Spoof, Flipperty Flop, Jumpkins and Golfette. By December 1889 Manchester shops were advertising Tiddledy Winks for Christmas, and on 20 December 1890 the same ladies' column, printed in both the Preston Chronicle and the Bristol Mercury, described 'a game from Oxford' in which counters are flipped into a little basin. In New York in December 1890, the toy seller E. I. Horsman showed a trade reporter a bundle of 65 letters, every one an order for his version, Tiddledy Winks Tennis.",
        "It began as an adult craze, played for laughs in Victorian drawing rooms, and only later became thought of as a children's game. Jaques sets were advertised in a New Zealand newspaper by July 1893, so they had reached this side of the world. In 1955 Cambridge University students turned it into a serious sport, and in 1958 Prince Philip sent the Goons to play for him."
      ],
      "howToPlay": [
        "Put a cup in the middle of a felt mat or tablecloth. Each player takes a set of small coloured counters (winks) and one larger counter (the squidger).",
        "Press the edge of the squidger down across the edge of a wink so the wink flips into the air.",
        "Try to land your winks in the cup. If you pot one, take another shot.",
        "You may land a wink on top of an opponent's wink to 'squop' it; a covered wink cannot be played until it is freed.",
        "The first player to pot all their winks wins, or count potted winks when time runs out."
      ],
      "didYouKnow": [
        "Fincher's 1889 trademark spelled it Tiddledy-Winks; the shorter Tiddlywinks came later.",
        "Even the earliest rules, from 1890, said a wink covered by a rival's wink could not be played, though back then landing on an opponent on purpose was thought bad form.",
        "Early squidgers were made of bone or vegetable ivory rather than plastic.",
        "In 1957 The Spectator asked 'Does Prince Philip cheat at tiddlywinks?', so Cambridge students challenged him to a match."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Origins and Early History of Tiddlywinks, tiddlywinks.org",
          "url": "https://tiddlywinks.org/tiddlywinks-history/origins-and-early-history-of-tiddlywinks/",
          "note": "Patent filed 8 November 1888, accepted 19 October 1889 (16,215); trademark 29 January and 15 May 1889 (85,800); American Stationer 4 December 1890 on Horsman's bundle of 65 letters for 'Tiddledy Winks Tennis'; 1890s rules on covered winks."
        },
        {
          "title": "Tiddlywinks Bibliography: Newspapers, tiddlywinks.org",
          "url": "https://tiddlywinks.org/bibliography-of-tiddlywinks-overview/tiddlywinks-bibliography-newspapers/",
          "note": "Manchester Times 14 December 1889 advert; Preston Chronicle and Bristol Mercury 20 December 1890 'Our Ladies' Column', 'A game from Oxford'; Otago Witness 13 July 1893 Jaques advert."
        },
        {
          "title": "Tiddlywinks, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tiddlywinks",
          "note": "Fincher bank clerk 1863 to 1900, Jaques exclusive distributor, rival names, 1890s craze, 1955 Cambridge, 1957 Spectator, 1958 Goons, squidger materials, squopping in 1890 rules."
        },
        {
          "title": "Tiddleywinks game, V&A collections",
          "url": "https://collections.vam.ac.uk/item/O184953/tiddleywinks-game-ilkeston-toys-ltd/",
          "note": "V&A statement on 1888 patent, 1889 trademark, adult parlour game, squidger and winks; 1930s Ilkeston Toys set sold as Tiddleywinks."
        },
        {
          "title": "The History of Tiddlywinks: A Victorian Craze, Jaques of London",
          "url": "https://www.jaqueslondon.co.uk/blogs/posts/the-history-of-tiddlywinks-a-victorian-craze",
          "note": "1890s craze as an adult phenomenon played in middle-class drawing rooms."
        }
      ],
      "uncertainties": [
        "No Australian newspaper could be opened (Trove blocked); the earliest Australasian evidence opened is a New Zealand Jaques advertisement of 13 July 1893, so the game had very likely reached Australia by then but that is inference.",
        "The 'exclusive distributor' claim comes from Wikipedia citing a dealer listing of an 1890s Jaques box.",
        "Both sceptic reports read the Preston Chronicle and Bristol Mercury items of 20 December 1890 as different pieces; the tiddlywinks.org bibliography shows the same 'Our Ladies' Column' text in both papers, so the entry credits both.",
        "The American Stationer item does not say the 65 letters were from dealers or that they arrived daily, so the entry now describes a single bundle of orders.",
        "The current legal status of the Tiddledy-Winks trademark was not confirmed on any page opened; the V&A record of a 1930s Ilkeston Toys set sold as Tiddleywinks supports generic use."
      ],
      "nameNotes": "Tiddledy-Winks was registered as a trademark in England in 1889. Tiddlywinks is a generic name today and many makers sell sets under it.",
      "confidence": "high",
      "playable": false,
      "realLife": true,
      "kind": "game"
    },
    {
      "id": "dots-and-boxes",
      "title": "Dots and Boxes",
      "era": "1880s",
      "year": 1889,
      "yearLabel": "1889",
      "origin": "Édouard Lucas, Paris, France",
      "blurb": "Join dots with pencil lines and capture the most boxes, a game a French mathematician published in 1889 after his students dreamed it up.",
      "story": [
        "Édouard Lucas was a French mathematician who taught at schools in Paris and adored puzzles; in 1883 he invented the Tower of Hanoi. In 1889 he published a dot-joining game in his book Jeux scientifiques and called it La Pipopipette. He said several of his former students at the École polytechnique had thought it up. 'Pipo' was school slang for the École polytechnique itself.",
        "Lucas's boxed version used a board of 25 squares, so a two-player game can never end in a draw. He did not see its spread for long. In 1891, at a banquet, a waiter dropped some crockery, a shard cut Lucas on the cheek, and he died a few days later of an infection, aged 49.",
        "All you need is paper and a pencil, so the game travelled everywhere under many names, including Boxes, Dots and Dashes, Game of Dots and Pigs in a Pen. Mathematicians still study it. Elwyn Berlekamp wrote a whole book on its strategy in 2000, and playing it perfectly has been shown to be extremely hard even for computers."
      ],
      "howToPlay": [
        "Players take turns drawing one line between two dots that are next to each other.",
        "Whoever draws the fourth side of a box claims it and takes another turn.",
        "When every line is drawn, the player with more boxes wins."
      ],
      "didYouKnow": [
        "The name Pipopipette comes from Pipo, French school slang for the École polytechnique.",
        "Lucas also invented the Tower of Hanoi puzzle in 1883 under the fake name N. Claus de Siam.",
        "In 1876 Lucas proved by hand that 2 to the power 127 minus 1 is prime, still the largest prime ever proved without a computer.",
        "Playing Dots and Boxes perfectly is PSPACE-complete, a class of problems that is very hard for computers."
      ],
      "computer": "The computer takes any box it can, then avoids drawing the third side of a box. On the harder setting it counts chains and tries to leave you the short ones.",
      "sources": [
        {
          "title": "Dots and boxes, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Dots_and_boxes",
          "note": "Lucas as first publisher, alternative names, chain strategy, PSPACE-complete, Berlekamp 2000; cites an 1895 Lucas text."
        },
        {
          "title": "La Pipopipette, French Wikipedia",
          "url": "https://fr.wikipedia.org/wiki/La_Pipopipette",
          "note": "1889 publication in Jeux scientifiques, attribution to 'ses élèves de l'École polytechnique', Pipo as the school's nickname in French school slang."
        },
        {
          "title": "La Pipopipette, Escale à jeux",
          "url": "https://escaleajeux.fr/fiche/pipop",
          "note": "1889, Jeux scientifiques, dedication to polytechnique students, 25-square board with no draws."
        },
        {
          "title": "Édouard Lucas, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/%C3%89douard_Lucas",
          "note": "Life dates, Tower of Hanoi 1883, 1876 Mersenne prime, death in 1891 after banquet accident."
        }
      ],
      "uncertainties": [
        "English Wikipedia's citation is to Lucas's L'arithmétique amusante (1895), while French Wikipedia and Escale à jeux give the 1889 Jeux scientifiques; 1889 is used here as the earlier and better-supported date.",
        "The claim that Lucas's students invented the game is Lucas's own attribution. Lucas taught at Paris lycées, not at the École polytechnique, so the students he credited were most likely former pupils who had gone on to that school; French Wikipedia says only 'ses élèves de l'École polytechnique'.",
        "French Wikipedia's wording ('dont Pipo est le surnom dans l'argot scolaire') makes Pipo the nickname of the school rather than of its students, as both the draft and Report A's correction turn on; the correction is followed.",
        "No dated craze or Australian newspaper evidence was found; this was a pencil game rather than a commercial product."
      ],
      "nameNotes": "No trademark issues. Pigs in a Pen is an alternative name; do not confuse it with the Pigs in Clover marble puzzle.",
      "confidence": "medium",
      "playable": true,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "pigs-in-clover",
      "title": "Pigs in Clover",
      "era": "1880s",
      "year": 1889,
      "yearLabel": "1889",
      "origin": "Charles Martin Crandall, Waverly, New York, USA",
      "blurb": "Tilt a little round box to roll marble 'pigs' through the gaps in three rings into the pen in the middle, without ever touching them.",
      "story": [
        "Charles Martin Crandall had been inventing toys since he was twelve and was famous for building blocks. At his Waverly Toy Works in New York State he invented Pigs in Clover early in 1889. Marbles were the pigs, cardboard rings were the clover, and the aim was to coax every pig into the central pen. A local paper reported the factory making 8000 a day and still twenty days behind on orders.",
        "On 13 March 1889 the New York Tribune reported that Senator William Evarts bought one from a street seller, played it for hours, then took it into the Senate. Senator George Vest borrowed it, a page was sent for five more, and six senators held a 'pig driving contest' in the cloakroom. On 17 March the New York World printed a cartoon asking whether President Harrison could get all his hungry pigs into the official pen.",
        "Over a million had sold by late April 1889. Copies appeared under names like Pigs in Sty. Crandall's patent was not granted until 10 September 1889, and even then he could not stop the imitators. The craze crossed the Atlantic: in June 1889 a newspaper in Chatham, New York State, joked that the English were 'squealing' because the puzzle had been introduced at the royal court. Mark Twain mentioned it in his 1892 novel The American Claimant."
      ],
      "howToPlay": [
        "Hold the round box flat with the marbles resting in the outer ring.",
        "Tilt the box gently so one marble rolls around until it finds the gap into the next ring.",
        "Work it inwards through each ring until it drops into the centre pen.",
        "Do the same for the other pigs without letting the first ones roll back out.",
        "You win when every pig is in the pen. No fingers allowed."
      ],
      "didYouKnow": [
        "Crandall's factory went from 8000 puzzles a day to a reported 50,000 a day at the height of the craze.",
        "A philanthropist in Kingston, New York ordered enough puzzles for every inmate in the county jail and almshouses.",
        "Sam Loyd claimed he invented it, and several of his obituaries repeated the false claim.",
        "In March 1889 the Chicago Tribune joked: 'Dinners grow cold. Young ladies are not dressed for the theaters. Business is paralyzed.'"
      ],
      "computer": "",
      "sources": [
        {
          "title": "Charles Martin Crandall, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Charles_Martin_Crandall",
          "note": "Early 1889 invention, Waverly Free Press 8000 a day, 13 March 1889 Senate story, 17 March 1889 cartoon, Kingston jail order (Chatham Republican 16 April 1889), Court of St James 'squealing' quote (Chatham Republican 11 June 1889), Twain, counterfeits and Pigs in Sty, injunction against one imitator, 50,000 a day, Loyd claim."
        },
        {
          "title": "The First Mobile Game Goes Viral: Pigs in Clover, The Strong National Museum of Play",
          "url": "https://www.museumofplay.org/blog/the-first-mobile-game-goes-viral-pigs-in-clover/",
          "note": "Three concentric rings on a wood base, 1889 patent, Selchow and Righter distribution, Chicago Tribune March 1889 quote, spread to Europe, Crandall unable to prosecute the many imitating firms."
        },
        {
          "title": "Crandall's Pigs in Clover, Antique Toy Collectors of America",
          "url": "https://atca-club.org/crandalls-pigs-in-clover/",
          "note": "Invented January 1889, patent filed February and awarded September 1889, over one million sold by late April 1889, Senate contest."
        },
        {
          "title": "The First Viral Handheld Puzzle Game?, Puzzculture",
          "url": "https://puzzculture.com/2018/10/16/the-first-viral-handheld-puzzle-game/",
          "note": "Senate cloakroom details and one million sales by late April 1889."
        },
        {
          "title": "US Patent 410,956, Game or Puzzle, C. M. Crandall, Google Patents",
          "url": "https://patents.google.com/patent/US410956A/en",
          "note": "Filed 21 February 1889, granted 10 September 1889; describes concentric grooves and fences and 'several marbles' without giving a number."
        }
      ],
      "uncertainties": [
        "The number of marbles in the original (often said to be four) is not stated on any page opened, including the patent text, so the text says 'marbles'.",
        "Report A dated the Chatham Republican 'squealing' item 16 April 1889, but the Wikipedia page cites it to 11 June 1889 (16 April is its citation for the Kingston jail order), so June is used here.",
        "ATCA gives 'over one million sold by late April 1889'; Wikipedia ties the one-million figure to the time of a Chicago injunction without giving a date.",
        "No Australian newspaper could be opened (Trove blocked), so arrival in Australia is unconfirmed, though the craze is documented in England by mid 1889."
      ],
      "nameNotes": "Pigs in Clover is a generic historical name; rivals sold Pigs in Sty and Pigs Running Wild. Do not confuse with the pencil game Pigs in a Pen (Dots and Boxes).",
      "confidence": "high",
      "playable": false,
      "realLife": true,
      "kind": "game"
    },
    {
      "id": "ludo",
      "title": "Ludo",
      "era": "1890s",
      "year": 1891,
      "yearLabel": "patented 1891",
      "origin": "Adapted from the Indian game Pachisi; patented in England by Alfred Collier as Royal Ludo, 1891",
      "blurb": "Roll a six to get each of your four pieces onto the track, race them around the cross-shaped board and send rivals home by landing on them.",
      "story": [
        "Ludo is a simplified English version of Pachisi, a game from India whose name comes from the Hindi word for twenty-five, the best throw with the cowrie shells used as dice. Cross-shaped boards appear in art from Chandraketugarh in West Bengal, a site famous for its baked clay (terracotta) carvings, dated to the 2nd to 1st century BC. The Mughal emperor Akbar is said to have played on a giant courtyard board at his palaces, using sixteen young women from his household as living pieces. A French traveller, Louis Rousselet, wrote this down in 1876, almost three centuries after Akbar's reign, and said the women were slaves.",
        "In 1891 Alfred Collier applied for an English patent on a game he called Royal Ludo. It was accepted on 31 October 1891 as patent number 14636, and Ludo, which is Latin for 'I play', was on sale in England by 1896. His version used one die in a dice cup, dropped the partnership play of Pachisi, and let a piece enter the track only on a throw of six. These changes made the game quicker and easier for young children.",
        "An earlier English game called Puchese was published on 11 April 1862, though its link to Ludo is unknown. Sailors in the Royal Navy play their own version, Uckers. In India, where Ludo is often played with two dice and star-marked safe squares, the newspaper The Hindu reported in June 2020 that Ludo had become the most popular game of the lockdown."
      ],
      "howToPlay": [
        "Each player takes four pieces of one colour and puts them in their home corner. Decide the order by rolling a die.",
        "On your turn roll one die. You need a six to move a piece from your corner onto your starting square. A six also earns another roll.",
        "Move one piece clockwise around the track by the number rolled. You must move if you can.",
        "If you land exactly on an opponent's piece, it goes back to its home corner and must roll a six to come out again.",
        "After a full lap, each piece turns up its own coloured home column towards the centre. It needs an exact roll to reach the finishing square.",
        "The first player to bring all four pieces home wins."
      ],
      "didYouKnow": [
        "Ludo is Latin for 'I play'. Its parent game, Pachisi, is Hindi for 'twenty-five', the top score with cowrie shells.",
        "Emperor Akbar is said to have used sixteen young women from his court as living pieces on a courtyard-sized board. The story comes from a French traveller writing in 1876.",
        "Pieces in early Ludo sets were flat discs of bone; today they are plastic or cardboard.",
        "Royal Navy sailors play a rowdy Ludo cousin called Uckers."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Games Board (gamesboard.org.uk): Patent 14636, Royal Ludo",
          "url": "https://www.gamesboard.org.uk/cgi-pub/gardpub.cgi?table=registrations&pk=1224&command=view",
          "note": "Patent 14636 applied for by Alfred Collier for Royal Ludo on 29 August 1891 and accepted on 31 October 1891; notes that the patent covers Royal Ludo rather than plain Ludo, though Collier Ludo boards quote the number."
        },
        {
          "title": "Wikipedia: Ludo",
          "url": "https://en.wikipedia.org/wiki/Ludo",
          "note": "Marketed in England 1896 by 'Alfred Coller' (citing R. C. Bell 1979), patent number 14636, Royal Ludo, Latin meaning, rules, Uckers, bone discs, The Hindu 13 June 2020 lockdown report."
        },
        {
          "title": "Wikipedia: Pachisi",
          "url": "https://en.wikipedia.org/wiki/Pachisi",
          "note": "Name meaning twenty-five, cowrie shells, Akbar's courtyard board with sixteen slaves (Rousselet, 1876, via Falkener 1892), cruciform boards in art reliefs of Chandraketugarh dated 2nd to 1st century BC, Parcheesi as a derivative."
        },
        {
          "title": "Wikipedia: Chandraketugarh",
          "url": "https://en.wikipedia.org/wiki/Chandraketugarh",
          "note": "Site in the 24 Parganas district of West Bengal, famous for its terracotta art; makes no mention of board games."
        },
        {
          "title": "Pachisi & Ludo: rules and history (vegard2.net)",
          "url": "https://pachisi.vegard2.net/ludo.html",
          "note": "First published in England 1896, patent 14636, Latin name, rule differences from Pachisi, Puchese published 11 April 1862."
        }
      ],
      "uncertainties": [
        "The two reviewers disagreed on the date and the spelling of the name. The Games Board patent database, which I opened, records patent 14636 for Royal Ludo, applied for by Alfred Collier on 29 August 1891 and accepted on 31 October 1891. Wikipedia (citing R. C. Bell 1979) says the game was marketed in 1896 and spells the name Coller. The patent record is the stronger source, so 1891 and Collier are used, with 1896 kept as the date it was on sale. The patent record also notes that the patent covers Royal Ludo rather than plain Ludo, although Collier Ludo boards quote the number, so 'patented 1891' is the honest label.",
        "Wikipedia's Pachisi article says cross-shaped boards appear in 'art reliefs of Chandraketugarh', but neither reviewer found an independent description of those reliefs. The site is known for terracotta rather than stone, so the draft's 'stone carvings' was removed.",
        "Akbar's living-piece board rests on a 19th-century account by Louis Rousselet (1876) as quoted on Wikipedia; nothing from Akbar's own time was checked.",
        "The rule that a six earns another roll is a common house rule; no cited page was checked for it.",
        "No Australian source could be opened: Museums Victoria lists a National Industries Ludo set (item 259440, 1928 to 1955) but blocked access, and Trove was inaccessible."
      ],
      "nameNotes": "Parcheesi is a Hasbro trademark; use Pachisi or Ludo. Sorry! is also a Hasbro brand. Ludo itself is a generic name.",
      "confidence": "medium",
      "playable": false,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "snakes-and-ladders",
      "title": "Snakes and Ladders",
      "era": "1890s",
      "year": 1892,
      "yearLabel": "1892",
      "origin": "Ancient India (Moksha Patam / Gyan Chaupar); first English edition registered by F. H. Ayres, London, 1892",
      "blurb": "Roll a die and race to square 100, climbing ladders of good deeds and sliding down snakes of bad ones, in a game that began in India as a lesson about karma.",
      "story": [
        "Snakes and Ladders began in India as Moksha Patam, a name often translated as 'board of enlightenment'. Nobody knows exactly when it began. A Jain version called Gyan Chaupar is often said to date from the 13th century, but the oldest boards historians describe were painted in the late 1700s. Boards had 72, 84 or 100 squares. Ladders stood for virtues such as generosity, faith and humility, and snakes for vices such as anger and theft. Most Indian boards had more snakes than ladders, so the climb was meant to be hard.",
        "British families returning from India brought the game home. The earliest known English version was registered by the maker F. H. Ayres in October 1892, with a circular board and a spiral track of 100 spaces. Victorian boards used English virtues. Ladders of Thrift, Penitence and Industry led to Fulfilment, Grace and Success, while snakes of Indolence and Disobedience dropped players into Poverty and Disgrace.",
        "A board made in Germany for British shops about 1900, now in the V&A in London, shows Punctuality leading up a ladder to Opulence, while Robbery slides down a snake to a beating. In 1943 the American firm Milton Bradley released Chutes and Ladders, replacing the snakes with playground slides because children at the time were thought to dislike snakes.",
        "In Australia the game was printed locally by the National Game Company. Its cardboard 'National Snakes and Ladders Game', made between 1930 and 1950, is held by the Powerhouse Museum in Sydney. By then the moral labels had gone and the board was simply red and blue squares joined by snakes and ladders of different sizes."
      ],
      "howToPlay": [
        "Players take turns rolling one die and moving that many squares along the winding path.",
        "Land at the bottom of a ladder and climb to its top. Land on a snake's head and slide to its tail.",
        "The first player to reach square 100 wins."
      ],
      "didYouKnow": [
        "Most Indian boards had more snakes than ladders. English makers gave the game equal numbers of each, making it kinder to players.",
        "The earliest known English version, registered in October 1892, was not a square grid at all but a circular board with a spiral track of 100 spaces.",
        "On one board made about 1900, Punctuality leads up a ladder to Opulence, while Robbery leads down a snake to a beating.",
        "Milton Bradley's 1943 Chutes and Ladders swapped the snakes for playground slides because children were thought to dislike snakes."
      ],
      "computer": "There is nothing to decide, so the computer only rolls. That is the point: Snakes and Ladders is pure chance, which makes it good for talking about probability.",
      "sources": [
        {
          "title": "Wikipedia: Snakes and ladders",
          "url": "https://en.wikipedia.org/wiki/Snakes_and_ladders",
          "note": "Indian origin, F. H. Ayres October 1892 registration (citing Topsfield 1985 and design registration 200682), circular spiral board, Victorian virtues and vices, more snakes than ladders on Indian boards, Chutes and Ladders 1943, rules."
        },
        {
          "title": "Wikipedia: Gyan chauper",
          "url": "https://en.wikipedia.org/wiki/Gyan_chauper",
          "note": "72, 84 and 100-square boards; the 100-square Muslim version with 17 ladders and 13 snakes; arrival in England in the 1890s (citing Topsfield 2006)."
        },
        {
          "title": "Sahapedia: Gyan Chaupar, the game that became Snakes and Ladders in British India",
          "url": "http://www.sahapedia.org/gyan-chaupar-game-became-snakes-and-ladders-british-india",
          "note": "Origin 'generally thought to be around the thirteenth century'; moksha-pata glossed as 'board of enlightenment'; nine snakes and five ladders on most Jain boards; a late-18th-century board painted on cloth in the National Museum, New Delhi."
        },
        {
          "title": "V&A Museum: Snakes and Ladders board game, c. 1900",
          "url": "https://collections.vam.ac.uk/item/O26347/snakes-and-ladders-board-game-unknown/",
          "note": "Board made in Germany for the British market about 1900; Punctuality to Opulence, Robbery to a beating; Moksha-Patamu link."
        },
        {
          "title": "Powerhouse Museum: 'The National Snakes and Ladders Game' game board",
          "url": "https://collection.powerhouse.com.au/object/42966",
          "note": "Australian-made board by the National Game Company, 1930 to 1950, object 85/2579-57, red and blue squares."
        },
        {
          "title": "Jaques of London blog: Who invented Snakes and Ladders?",
          "url": "https://www.jaqueslondon.co.uk/blogs/posts/who-invented-snakes-and-ladders",
          "note": "Company claim that Jaques published the first English edition in 1892; used only to flag a disagreement."
        }
      ],
      "uncertainties": [
        "Jaques of London claims it published the first English-language edition in 1892, while Wikipedia (citing Topsfield and a National Archives design registration) credits F. H. Ayres in October 1892. The Ayres claim is better documented, so 1892 is safe but the maker is disputed.",
        "The date of the Indian original is unsettled. Wikipedia's Gyan chauper article has a garbled sentence pointing to a 10th-century Jain text; Sahapedia says the game is generally thought to be about the 13th century; a reviewer citing a Topsfield-based review says the earliest reliably dated board is a Lucknow board of 1780 to 1782 and that no board or text from the 10th to 13th centuries survives. The draft's 10th-century claim was removed.",
        "The meaning of Moksha Patam differs between sources: Wikipedia's uncited lede gives 'liberation lesson', Sahapedia gives 'board of enlightenment'. The Sahapedia gloss is used.",
        "Not every Indian board had more snakes than ladders. Sahapedia says most Jain boards have nine snakes and five ladders, but Wikipedia's Gyan chauper article says the 100-square Muslim version had 17 ladders and 13 snakes, so 'most' is used.",
        "Exact square numbers for the Indian virtues and vices vary between boards; the examples given come from Wikipedia and Gyan chauper summaries, not from an original board I examined.",
        "Trove newspapers could not be opened (bot protection), so no 1890s Australian newspaper mention was confirmed. The earliest Australian evidence found is the Powerhouse Museum board from 1930 to 1950. Museums Victoria lists a similar National board (item 265948) but the page was blocked."
      ],
      "nameNotes": "Chutes and Ladders is a Milton Bradley (now Hasbro) product name; use Snakes and Ladders. Moksha Patam and Gyan Chaupar are generic Indian names and safe to use.",
      "confidence": "high",
      "playable": true,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "hangman",
      "title": "Hangman",
      "era": "1890s",
      "year": 1894,
      "yearLabel": "first recorded 1894",
      "origin": "Unknown; first recorded by Alice Bertha Gomme at Barnes, England, 1894, as Birds, Beasts, and Fishes",
      "blurb": "Guess a hidden word one letter at a time; in the 1894 version children scored points on a slate and nobody got hanged.",
      "story": [
        "Nobody knows who invented Hangman. The earliest record is from 1894, when the folklorist Alice Bertha Gomme published The Traditional Games of England, Scotland, and Ireland. She collected a slate game called Birds, Beasts, and Fishes at Barnes, near London. There was no gallows and no hanged man. It was a word puzzle with points.",
        "In Gomme's version, one child wrote the first and last letters of an animal's name on a slate, with crosses for the missing letters, like B×××××××h for Bullfinch. They said whether it was a bird, beast or fish. The others guessed in turn. The first correct guesser scored one mark for each cross and set the next word. If nobody guessed, the writer took the marks.",
        "The hanged man came later. On 16 February 1902 The Philadelphia Inquirer described a 'White Cap Party' where guests wore white peaked caps with masks and played a version with hanging pictures. Today a wrong guess adds a body part to a stick figure, and some teachers prefer gentler scoring, such as crossing apples off a tree.",
        "A 2010 study by Jon McLoone of Wolfram Research found that the hardest English words to guess include jazz, buzz, hajj, faff and fizz, because they avoid common letters. The twelve most common letters in English, e t a o i n s h r d l u, give guessers their best opening moves."
      ],
      "howToPlay": [
        "One player thinks of a word and shows a dash for each letter.",
        "The other player guesses letters. Right letters go in their places; wrong letters count against you.",
        "Guess the word before you run out of wrong guesses."
      ],
      "didYouKnow": [
        "The 1894 version had no hanged man at all. Players scored marks on a slate, one for each missing letter they guessed.",
        "Gomme's example words were Bullfinch, Elephant and Swordfish, written as B×××××××h, E××××××t and S×××××××h.",
        "The earliest known version with hanging pictures was played at a 1902 Philadelphia children's party where guests wore white peaked caps and masks.",
        "The hardest words to guess include jazz, buzz and hajj, according to a 2010 Wolfram Research study."
      ],
      "computer": "The computer picks words that kids in the 1890s would have known, and tells you what they mean afterwards. Guess common letters first: E, A, R, O and T appear most often in English.",
      "sources": [
        {
          "title": "Alice Bertha Gomme, The Traditional Games of England, Scotland, and Ireland, Vol. I (1894), Project Gutenberg text",
          "url": "https://www.gutenberg.org/cache/epub/41727/pg41727.txt",
          "note": "Full text of the Birds, Beasts, and Fishes entry: slate game, crosses for missing letters, example words Bullfinch, Elephant and Swordfish, scoring by marks, writer takes the marks if nobody guesses, collected at Barnes."
        },
        {
          "title": "Wikipedia: Hangman (game)",
          "url": "https://en.wikipedia.org/wiki/Hangman_(game)",
          "note": "Gomme 1894 as earliest reference; Philadelphia Inquirer 'A White Cap Party', 16 February 1902, p. 39; modern rules; apple-tree alternative; letter frequency and 2010 Wolfram study by Jon McLoone."
        }
      ],
      "uncertainties": [
        "The true origin of Hangman is unknown; 1894 is only the earliest written record, and the game may be older.",
        "The 1902 Philadelphia Inquirer article ('A White Cap Party', p. 39) is cited by Wikipedia via Newspapers.com. Neither the reviewers nor I could open the scan, so the description of it as a children's party rests on Wikipedia's image caption alone.",
        "No Australian reference was confirmed because Trove was inaccessible during research."
      ],
      "nameNotes": "",
      "confidence": "medium",
      "playable": true,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "penny-arcade",
      "title": "The Penny Arcade",
      "era": "1890s",
      "year": 1894,
      "yearLabel": "1894",
      "origin": "New York, United States; Holland Brothers' Kinetoscope parlour, 14 April 1894",
      "blurb": "Before video games, an 'arcade' was a hall of coin-in-the-slot machines where a penny bought a one-minute movie, a test of your grip or a card telling your fortune.",
      "story": [
        "The word arcade comes from Latin arcus, meaning a bow or arch. By 1731 it meant a passage roofed with arches, and by 1795 a covered walkway lined with shops. When coin-operated machines were lined up in a hall or shop in the same way, people called that an arcade too. The term penny arcade is first recorded in 1903 and was common by 1905 to 1910.",
        "The first such hall opened on 14 April 1894 at 1155 Broadway, New York, when the Holland Brothers set up ten Edison Kinetoscopes in two rows of five. For 25 cents a visitor could peep into every machine in one row and watch films of about 20 seconds, such as a strongman and a barber shop. By 1 June 1894 there were parlours in Chicago and San Francisco.",
        "Herman Casler's Mutoscope, patented on 5 November 1895, was cheaper. You dropped a coin and turned a crank to flip about 850 photo cards past a lens, giving about a minute of moving pictures. In November 1898 the San Francisco Call reported twenty machines 'crowded day and night with sightseers'. In April 1899 the same paper attacked them for corrupting the young.",
        "Arcades also had lifting, grip and lung testers, punching machines and fortune tellers. A Mills Novelty Company guide of about 1907 priced its most expensive full arcade at about $5,000. In 1904 William Hollinworth of the Australasian Mutoscope Company, Sydney, sent Mutoscopes on tour with a vaudeville show. It opened at Cairns in June, worked south through Queensland to northern New South Wales, and came back to Brisbane, where it played in September and October. In Britain, Mutoscopes stayed on seaside piers until decimal coins arrived in 1971."
      ],
      "howToPlay": [
        "This is a story entry, not a game, but here is how a visit worked around 1900. Change your money into pennies at the counter. In America the one-cent coin is also called a penny.",
        "Pick a machine from the rows along the walls. Each one did a single thing, described on a poster on its front.",
        "Drop a coin in the slot. On a Mutoscope, put your eyes to the hood and turn the hand crank at a steady speed for about a minute of moving pictures.",
        "Try an athletic machine: pull a lifting handle, squeeze a grip tester or blow into a lung tester to see your score on the dial.",
        "Finish at the fortune teller, which dropped a printed card with your future on it."
      ],
      "didYouKnow": [
        "The first Kinetoscope parlour took about $1,400 a month against $515 in costs during its first fifty weeks.",
        "In Britain, Mutoscopes were nicknamed 'What the Butler Saw' machines after one famous reel.",
        "You can turn a Mutoscope crank backwards, but the pictures still will not run in reverse.",
        "The phrase 'arcade game' is first recorded in 1977, more than eighty years after the first penny arcades."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Online Etymology Dictionary: arcade",
          "url": "https://www.etymonline.com/word/arcade",
          "note": "Latin arcus, Italian arcata; 1731 covered passage of arches, 1795 avenue lined with shops; arcade game 1977."
        },
        {
          "title": "Merriam-Webster: penny arcade",
          "url": "https://www.merriam-webster.com/dictionary/penny%20arcade",
          "note": "Definition and first known use 1903."
        },
        {
          "title": "Wikipedia: Amusement arcade (Penny arcade section)",
          "url": "https://en.wikipedia.org/wiki/Amusement_arcade",
          "note": "Term in use about 1905 to 1910 (citing Nasaw), named from the penny coin, list of machines including Mutoscopes, fortune tellers and love testers."
        },
        {
          "title": "Wikipedia: Kinetoscope",
          "url": "https://en.wikipedia.org/wiki/Kinetoscope",
          "note": "Holland Brothers' parlour opened 14 April 1894 at 1155 Broadway, ten machines in two rows of five, 25 cents a row, films of 15 to 20 seconds including Sandow and Barber Shop, Chicago and San Francisco by 1 June 1894, receipts of about $1,400 a month against $515 costs."
        },
        {
          "title": "Wikipedia: Mutoscope",
          "url": "https://en.wikipedia.org/wiki/Mutoscope",
          "note": "Casler and Dickson, US patent 549309 granted 5 November 1895, 850-card reels, hand crank that turns both ways but does not reverse the reel, San Francisco Call 6 November 1898 and 1 April 1899, What the Butler Saw, UK piers until 1971."
        },
        {
          "title": "Australian Variety Theatre Archive (OzVTA): Troupes M to R, Mutoscope Biotint Co",
          "url": "https://ozvta.com/troupes-m-r/",
          "note": "William Hollinworth, general manager of the Australasian Mutoscope Company, Sydney, organised the 1904 vaudeville, Mutoscope and Biotint tour: Cairns from mid-June, south through to northern New South Wales, Brisbane in September at Centennial Hall, Theatre Royal from early October."
        },
        {
          "title": "The Golden Age Arcade Historian: A Trip to the Penny Arcade, circa 1907 (secondary blog post)",
          "url": "http://allincolorforaquarter.blogspot.com/2012/10/a-trip-to-penny-arcade-circa-1907.html",
          "note": "Secondary source quoting Dick Bueschel's book Arcade 1: the Mills Novelty Company guide 'Mills Penny Arcades' of about 1907, with the most expensive setup at around $5,000 including a lifting machine, grip machine, lung tester, bag punching machine and Sibille fortune teller."
        }
      ],
      "uncertainties": [
        "Sources differ slightly on when the phrase penny arcade arose: Merriam-Webster gives a first known use of 1903, while Nasaw (via Wikipedia) says between 1905 and 1910.",
        "The 1907 Mills Novelty Company arcade description and the strength and lung tester details come from a games-history blog quoting Dick Bueschel's book Arcade 1; the book itself was not opened, so the blog is listed as a secondary source only.",
        "The 1904 tour details come from the OzVTA troupes page, which gives mid-June for Cairns, September for Brisbane and early October for the move to the Theatre Royal, but no exact days. OzVTA says no reports of the company were found in Australian or New Zealand newspapers after the Brisbane season, so where the tour ended is not certain.",
        "Trove newspapers could not be opened (bot protection). A Trove search hit exists for 'The Mutoscope Biotint Tour', Morning Post (Cairns), 24 June 1904, article 42958718, which would give Australian newspaper evidence, but it could not be read, so it is not listed as a source and no Australian report of 1890s penny-in-the-slot machines was confirmed."
      ],
      "nameNotes": "Kinetoscope and Mutoscope were company product names (Edison and American Mutoscope Company); fine to use historically. Penny Arcade is also the name of a modern webcomic, so avoid implying any link.",
      "confidence": "high",
      "playable": false,
      "realLife": false,
      "kind": "story"
    },
    {
      "id": "rock-paper-scissors",
      "title": "Rock Paper Scissors",
      "era": "1900s",
      "year": 1900,
      "yearLabel": "Japan, 1800s; first English reports 1921 to 1924",
      "origin": "Japan (janken), from older Chinese hand games",
      "blurb": "Shake your fist three times and show rock, paper or scissors, a Japanese hand game that English speakers were still having explained to them in the 1920s.",
      "story": [
        "Hand games where three signs each beat one other go back a long way in China. A Ming dynasty writer, Xie Zhaozhe, described a game called shoushiling around 1600 and claimed it dated to the Han dynasty. Such games reached Japan, where they were called sansukumi-ken, meaning the hand game of three who fear each other.",
        "The oldest Japanese version, mushi-ken, used a frog, a slug and a snake. The most popular, kitsune-ken, used a fox, a hunter and a village head, acted out with both hands. The rock, paper and scissors form, janken, developed in Japan in the 1800s and became the standard version.",
        "Westerners met the game in the early 1900s. On 7 January 1921 a cricket writer in the Sydney Morning Herald mentioned stone, scissors and paper as a German way of drawing lots he had come across while travelling on the Continent. In March 1924 letters in The Times in London described a game called zhot, and a reader replied that it was clearly Japanese jan-ken-pon.",
        "A 1932 New York Times article about Tokyo commuters still explained the rules to American readers. In 1933 Compton's Pictured Encyclopedia suggested American boys and girls might like to practise it. In 2005 a Japanese company even chose between the auction houses Christie's and Sotheby's with a game of rock paper scissors."
      ],
      "howToPlay": [
        "Two players face each other with one hand closed in a fist.",
        "Together, pump your fists up and down three times, saying rock, paper, scissors or one, two, three.",
        "On the third beat show one sign: a fist for rock, a flat hand for paper, or two fingers out for scissors.",
        "Rock blunts scissors, scissors cut paper, and paper wraps rock. The same sign is a draw, so play again.",
        "Play best of three to settle who goes first or who gets the last biscuit."
      ],
      "didYouKnow": [
        "Japan's oldest version, mushi-ken, used a frog, a slug and a snake instead of rock, paper and scissors.",
        "One of the first English-language mentions appeared in an Australian newspaper, the Sydney Morning Herald, on 7 January 1921.",
        "The French name chi-fou-mi comes from the Old Japanese words for one, two, three.",
        "In 2005 a Japanese firm let rock paper scissors decide which auction house would sell its art collection."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Rock paper scissors - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Rock_paper_scissors",
          "note": "Chinese and Japanese history, 1921 Sydney Morning Herald (Teutonic method, the Continent), 1924 Times letters, 1927 France, 1932 NYT, 1933 Compton's, 2005 auction"
        },
        {
          "title": "Sansukumi-ken - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Sansukumi-ken",
          "note": "Meaning, mushi-ken (frog, slug, snake), kitsune-ken, dates 1774 and 1809"
        },
        {
          "title": "The Long, Winding History of Rock Paper Scissors - Popular Mechanics via Yahoo",
          "url": "https://tech.yahoo.com/general/articles/long-winding-history-rock-paper-140000649.html",
          "note": "Summary of Western spread 1921 to 1932 and modern championships"
        }
      ],
      "uncertainties": [
        "Exactly when the rock, paper, scissors form became standard in Japan is unclear; sources say between the Edo and Meiji periods, in the late 1800s.",
        "The 1921 Sydney Morning Herald mention is cited from Wikipedia, whose citation names the writer as Poidevin in a Test Match column on page 8. Trove was still blocked by a bot check during editing, so the page itself could not be opened.",
        "The 1921 Australian writer called it a Teutonic (German) method, so early Western players did not always know it was Japanese.",
        "The year field of 1900 is a placeholder for the era; the yearLabel gives the real dates and should be the value shown."
      ],
      "nameNotes": "Roshambo and Ro-Sham-Bo are common nicknames; use the plain name Rock Paper Scissors. Also known as scissors paper rock in Australia.",
      "confidence": "medium",
      "playable": false,
      "realLife": true,
      "kind": "game"
    },
    {
      "id": "nim",
      "title": "Nim",
      "era": "1900s",
      "year": 1901,
      "yearLabel": "solved 1901; played long before",
      "origin": "Named and solved by Charles L. Bouton, Harvard University, USA; possibly from the Chinese game jian-shizi",
      "blurb": "Take matches from rows and grab the last one to win, in a game a Harvard professor cracked with pure maths in 1901.",
      "story": [
        "Nim is a game of piles. Players take turns removing matches, stones or coins from one pile, and the last pile decides the winner. Games like this are old. Nim closely resembles the Chinese game jian-shizi, or picking stones, and similar games are said to have been played in Europe from the early 1500s, though nobody knows exactly where it began.",
        "In 1901 Charles L. Bouton, a mathematician at Harvard University, published a paper in the Annals of Mathematics called Nim, a Game with a Complete Mathematical Theory. He wrote that forms of the game were already played at American colleges and fairs, sometimes under the name Fan-Tan, and he proposed the name Nim instead. He showed that by writing the pile sizes in binary you can work out a winning move from any position. His paper gave Nim a complete winning strategy, something very few games have.",
        "Nim then became a star of early machines. At the New York World's Fair in 1940 the Westinghouse company showed the Nimatron, a one tonne relay machine that played about 100,000 games and won about 90,000. Rare winners got a token stamped Nim Champ.",
        "In 1951 the Ferranti company built Nimrod for the Festival of Britain. It was designed by John Bennett, an Australian who had studied at Cambridge, and was twelve feet wide. Alan Turing played it. Crowds mostly came to gawk at the flashing lights, but Nimrod is often called one of the first computer games."
      ],
      "howToPlay": [
        "Start with a few rows of matches.",
        "On your turn take as many matches as you like, but all from one row.",
        "The player who takes the last match wins."
      ],
      "didYouKnow": [
        "Bouton's 1901 paper gave the game its name. The Oxford English Dictionary links it to the German word nimm, meaning take.",
        "The Nimatron weighed more than a tonne and used 116 relays and over two miles of copper wire.",
        "Nimrod was twelve feet wide, but the actual computer took up about two per cent of its volume. The rest was valves and lights.",
        "The 1961 French film Last Year at Marienbad features Nim played with rows of 1, 3, 5 and 7, where the player who takes the last match loses. This is now called the Marienbad version."
      ],
      "computer": "The computer writes each row's count in binary and adds the columns without carrying (exclusive or). If the result is zero, you are in trouble. It always moves to make it zero. Turn on \"Show the secret\" to see it.",
      "sources": [
        {
          "title": "Nim - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Nim",
          "note": "History, Chinese jian-shizi, Bouton 1901, Nimatron and Nimrod, rules, Marienbad"
        },
        {
          "title": "Bouton, Nim, A Game with a Complete Mathematical Theory (1901) PDF",
          "url": "https://webdocs.cs.ualberta.ca/~hayward/cgt/asn/bouton1901.pdf",
          "note": "Original paper, Annals of Mathematics 2nd series vol. 3; binary strategy; played at American colleges and fairs, called Fan-Tan, name Nim proposed"
        },
        {
          "title": "Nimatron - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Nimatron",
          "note": "Condon, Westinghouse, 1940 World's Fair, 100,000 games, Nim Champ token, weight and relays"
        },
        {
          "title": "Nimrod (computer) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Nimrod_(computer)",
          "note": "Ferranti, John Bennett (Australian), Festival of Britain 5 May 1951, size, Turing"
        },
        {
          "title": "Nim - Wolfram MathWorld",
          "url": "https://mathworld.wolfram.com/Nim.html",
          "note": "Rules and Bouton citation"
        },
        {
          "title": "Marienbad - Wolfram MathWorld",
          "url": "https://mathworld.wolfram.com/Marienbad.html",
          "note": "Film version uses heaps of 1, 3, 5 and 7; the player making the last move loses"
        }
      ],
      "uncertainties": [
        "The ultimate origin of the game is unknown; the Chinese link is a resemblance, not a documented line of descent, and Wikipedia's sentence about European references from the early 1500s carries no citation.",
        "Wikipedia's Nim article gives the Nimatron run as 11 May to 27 October 1940, while the Nimatron article says April to October 1940. A reviewer noted that the fair's 1940 season did not open until May, so the Nim article's dates are used.",
        "The draft called Nim one of the first games ever fully solved. No opened source ranks it that way, so the claim was removed.",
        "Whether Nimrod counts as the first computer game depends on the definition; it used light bulbs rather than a screen.",
        "No Australian newspaper report on Nim could be checked because Trove was blocked by a bot check during research and editing."
      ],
      "nameNotes": "",
      "confidence": "high",
      "playable": true,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "klondike",
      "title": "Klondike Patience",
      "era": "1890s",
      "year": 1905,
      "yearLabel": "first printed 1905",
      "origin": "Unknown; United States or Britain, name recorded by 1905",
      "blurb": "Deal seven piles, build red on black down the columns and move every card up to the aces, in the patience game that was later built into Windows as Solitaire.",
      "story": [
        "Patience, called solitaire in America, is older than Klondike. The card historian David Parlett traces it to Germany, where it appears in a 1791 games book and may go back to about 1758. Klondike is the version most people know today: seven columns, red on black, aces up top. Nobody knows where the name came from. Some writers link it to the Klondike Gold Rush, but no proof has been found.",
        "Gold was found on Bonanza Creek in the Yukon on 16 August 1896, and about 100,000 people set out for the Klondike. The card game turns up in print soon after. Tarbart's Patience Games (1905) described it as Gambler's Delight, the 1907 Hoyle's Games called it Seven-Card Klondike, and by 1913 the Official Rules of Card Games listed it simply as Klondike.",
        "Some time after 1900 the gambler Richard Canfield offered the game at his casino in Saratoga Springs, New York. A casino is a place where adults bet money. A player bought a pack for $50 (some say $52) and was paid $5 for every card placed on the foundations. Because of this, American books of 1908 called the game Canfield, a name that still causes confusion today.",
        "The game's biggest boost came in 1990, when Microsoft put it in Windows 3.0 as Solitaire. It helped people learn to use a mouse, because moving a card meant dragging and dropping it. By 1994 Microsoft was saying that Solitaire was one of the most-used programs on Windows. Mathematician Persi Diaconis has called the unknown chance of winning 'one of the embarrassments of applied probability'."
      ],
      "howToPlay": [
        "Shuffle a 52-card pack with no jokers. Deal seven piles in a row: one card in the first, two in the second, up to seven in the last. Turn the top card of each pile face up. That is 28 cards; the rest is the stock.",
        "Build down the piles in alternating colours, for example a red six on a black seven. You may move a face-up run of cards together.",
        "When an ace appears, move it to one of four foundation spaces above the piles. Build each foundation up in suit from ace to king.",
        "When a pile's face-up cards are all moved, turn over the next face-down card. An empty pile may be filled only with a king (or a run starting with a king).",
        "Turn cards from the stock one at a time (easier) or three at a time (harder) and play what you can. When the stock runs out, turn the waste pile over and go through again.",
        "You win when all 52 cards are on the four foundations."
      ],
      "didYouKnow": [
        "Nobody has proved the game is named after the Klondike Gold Rush, even though the rush (1896 to 1899) matches the era when the game first appears.",
        "At Canfield's casino you bought a pack for $50 (some say $52) and got $5 back for every card you played to the foundations, so you needed ten or eleven cards just to get your money back.",
        "Microsoft's own usage figures have put Solitaire among the three most-used Windows programs, with FreeCell seventh, both ahead of Word and Excel.",
        "The exact chance of winning Klondike is still unknown; mathematician Persi Diaconis calls that an embarrassment for probability theory."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Wikipedia: Klondike (solitaire)",
          "url": "https://en.wikipedia.org/wiki/Klondike_(solitaire)",
          "note": "Name origin unknown, 1907 Hoyle's Games Seven-Card Klondike, 1913 Official Rules, Canfield confusion, Windows in the 1990s, 1994 Washington Post statement on usage, Diaconis quote, rules and win rates."
        },
        {
          "title": "Wikipedia: Microsoft Solitaire",
          "url": "https://en.wikipedia.org/wiki/Microsoft_Solitaire",
          "note": "Included in Windows since Windows 3.0 in 1990; useful for teaching mouse use and drag-and-drop; Microsoft telemetry placing Solitaire among the three most-used Windows programs and FreeCell seventh, ahead of Word and Excel."
        },
        {
          "title": "Wikipedia: Canfield (solitaire)",
          "url": "https://en.wikipedia.org/wiki/Canfield_(solitaire)",
          "note": "Richard Canfield's Saratoga Springs casino 'some time after 1900', $50 or $52 per pack and $5 per card, 1908 Hapgood and Dick books, Demon first recorded 1891 by Mary Whitmore Jones, and its claim that the 1907 Hoyle 'Klondike' is a gambling version of Demon."
        },
        {
          "title": "Solitaire Laboratory: What game was played at Canfield's Casino?",
          "url": "http://www.solitairelaboratory.com/canfield.html",
          "note": "Tarbart's Patience Games 1905 'Gambler's Delight' as first publication of Klondike; 1908 Canfield names; 1913 Klondike; argues the casino game was Klondike."
        },
        {
          "title": "David Parlett: History of patience games",
          "url": "https://www.parlettgames.uk/histocs/patience.html",
          "note": "Patience first in a 1791 German games book, dated to about 1758; Lady Cadogan's collection; Parlett's own aside linking Klondike to the gold rush."
        },
        {
          "title": "Wikipedia: Klondike Gold Rush",
          "url": "https://en.wikipedia.org/wiki/Klondike_Gold_Rush",
          "note": "Gold discovered 16 August 1896 at Bonanza Creek; about 100,000 prospectors; rush 1896 to 1899."
        }
      ],
      "uncertainties": [
        "Sources disagree on the name: Wikipedia says no evidence links Klondike to the gold rush, while Parlett's history page states the link as fact in passing. Treated here as unproven.",
        "Earliest print date: Keller (Solitaire Laboratory) gives Tarbart's Patience Games, 1905, as 'Gambler's Delight'; Wikipedia gives the 1907 Hoyle's Games. Both are later than the 1890s era this hall covers.",
        "Wikipedia's Canfield (solitaire) article argues that the 1907 Hoyle's Games entry called Klondike is really a gambling version of Demon, while Wikipedia's Klondike article and Keller treat it as Klondike. The entry follows Keller and the Klondike article.",
        "Richard Canfield's dates differ: Wikipedia's Richard Canfield article (opened by a reviewer) says he took the Saratoga Clubhouse in 1893 as a partnership, bought it outright in 1894, that gambling there ended in 1907 and that he sold it in 1911; Keller says he bought it in 1884 and owned it until 1911. One reviewer suggested 'around 1900' for the casino game, but the Wikipedia Canfield (solitaire) page says 'some time after 1900', so that wording is kept.",
        "The price of a pack at Canfield's casino is given as $50 by some sources and $52 by others.",
        "The 1994 Washington Post article behind the 'most-used application' claim could not be opened (403). Wikipedia's Microsoft Solitaire article says only that Microsoft telemetry placed Solitaire 'among the three most-used Windows programs' and gives no year for that figure, so the wording was softened.",
        "No Australian reference was confirmed; Trove was inaccessible."
      ],
      "nameNotes": "Klondike, Patience and Solitaire are all generic. 'Microsoft Solitaire' is a Microsoft product name; avoid it as a title. In America 'Canfield' can mean either Klondike or the different British game Demon.",
      "confidence": "medium",
      "playable": false,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "diabolo",
      "title": "Diabolo",
      "era": "1900s",
      "year": 1906,
      "yearLabel": "patented 1905 to 1906; craze of 1907",
      "origin": "Gustave Philippart, Belgian engineer, Brussels and Paris; from the Chinese kongzhong",
      "blurb": "Spin a double cone on a string stretched between two sticks, then toss it high and catch it, in the toy that sent Paris and London wild in 1907.",
      "story": [
        "The diabolo began in China, where it was called kongzhong, or air bell. It was described in detail in a 1635 book about Beijing, written near the end of the Ming dynasty. A French missionary living in Beijing, Father Amiot, gave Europeans their first known description of it in about 1792. He described two hollow cylinders of metal, wood or bamboo, joined in the middle by a cross-piece and spun on a string.",
        "Europe had a first craze in 1812, when the toy was called the devil on two sticks. Wealthy adults and children played it in Paris and London, with versions made of tin, hardwood and even crystal, before it faded from fashion.",
        "Gustave Philippart, a Belgian engineer, is said to have spent about seven years and 150 prototypes perfecting the toy. He gave the cups their cone shape, applied for a patent in 1905 that was granted in 1906, and is usually credited with the name diabolo, though some give the credit to the English cricketer C. B. Fry. In 1907 he and friends played every morning in the Bois de Boulogne, Paris. Walkers rushed to buy one and the craze was born.",
        "Theatres staged a diabolo ballet and songwriters published diabolo tunes, nearly all dated 1907. The craze crossed to Britain, where C. B. Fry had already written about the toy in 1906. It had a dangerous side too. Injuries to players and passers-by were reported, and the Paris police chief Louis Lepine banned the game in the streets of Paris."
      ],
      "howToPlay": [
        "Lay the diabolo on the ground in front of you with the string under it. Hold one stick in each hand.",
        "Lift it and roll it along the string, then move your right hand up and down to make it spin. Keep the string a little slack so it spins faster.",
        "If it tips forward or back, move the leading stick in the direction of the tilt to level it.",
        "Once it is spinning fast, pull both sticks apart sharply to toss it into the air.",
        "Catch it on the string by pointing one stick at the falling diabolo and letting it slide down, then keep spinning."
      ],
      "didYouKnow": [
        "The old name was the devil on two sticks. The Oxford Dictionary traces diabolo to the Latin diabolus, meaning devil.",
        "Philippart is said to have built about 150 prototypes before he was happy with his cone-shaped diabolo.",
        "The first known Western account came from a French missionary living in Beijing, Father Amiot, in about 1792.",
        "After a run of accidents, the Paris police chief Louis Lepine banned diabolo playing in the streets of Paris."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Diabolo - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Diabolo",
          "note": "Chinese origins, Amiot description, 1812 craze, Philippart, name and C. B. Fry, etymology, injuries claimed and Lepine street ban"
        },
        {
          "title": "Dijing Jingwulue - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Dijing_Jingwulue",
          "note": "Ming dynasty book about Beijing by Liu Tong; preface dated 1635"
        },
        {
          "title": "US Patent 822,628, Double top for games, Gustave Philippart - Google Patents",
          "url": "https://patents.google.com/patent/US822628",
          "note": "Filed 1 August 1905, granted 5 June 1906; inventor of Brussels, Belgium; game called Diable in the text"
        },
        {
          "title": "The European Diabolo Craze of 1812 - International Jugglers' Association",
          "url": "https://www.juggle.org/the-european-diabolo-craze-of-1812-and-the-first-western-diabolo/",
          "note": "1812 to 1813 craze, devil on two sticks, materials, Philippart c. 1905"
        },
        {
          "title": "A Devil's Game: Diabolo - Images Musicales blog",
          "url": "https://blog.imagesmusicales.be/a-devils-game-diabolo/",
          "note": "Philippart's seven years and 150 prototypes, Bois de Boulogne, ballet, songs, accidents and police ordinance"
        },
        {
          "title": "The diabolo - BnF / CNAC circus arts site",
          "url": "https://cirque-cnac.bnf.fr/en/diabolo",
          "note": "Philippart 1861 to 1933, 1906 redesign and cone shape, bans in public spaces"
        }
      ],
      "uncertainties": [
        "Sources give Philippart's patent as 1905 or 1906. The US patent was filed on 1 August 1905 and granted on 5 June 1906, so both are right about different events. The patent text calls the game Diable rather than diabolo.",
        "The 1905 US patent gives Philippart's home as Brussels, while the Images Musicales blog places him in Paris.",
        "Two name origins are offered: Latin diabolus (devil) and Greek dia plus ballo (throw across).",
        "Wikipedia dates Amiot's description to 1792 during Lord Macartney's embassy, but a reviewer pointed out that the embassy did not reach Beijing until 1793, so only the approximate date is given.",
        "Wikipedia's Diabolo article places the earliest Chinese mention in the Wanli period (1572 to 1620) but cites a book whose preface is dated 1635; the book date is used.",
        "The seven years and 150 prototypes figure comes from a single blog post with no primary source.",
        "An Images Musicales blog post says the Paris craze ended after a diabolo fell on a pram on the Champs-Elysees and killed a baby. The claim is undated and not confirmed elsewhere, so it has been left out of the story.",
        "Trove was blocked by a bot check, so the Australian arrival of the craze could not be confirmed from an opened page; a search listing showed a Braidwood Express item headed A Novelty Craze dated 16 November 1906 but it could not be opened."
      ],
      "nameNotes": "Diabolo is a generic word for the toy, not a trademark. Avoid Chinese yo-yo as a title; use diabolo.",
      "confidence": "medium",
      "playable": false,
      "realLife": true,
      "kind": "game"
    },
    {
      "id": "jigsaw-puzzle",
      "title": "Jigsaw Puzzle",
      "era": "1900s",
      "year": 1908,
      "yearLabel": "craze of 1908; dissected maps from the 1760s",
      "origin": "John Spilsbury, London, England (dissected maps); adult craze began in the north-eastern USA around 1907 to 1908",
      "blurb": "Fit hundreds of oddly cut wooden pieces back into a picture, a hobby that in 1909 forced Parker Brothers to stop making every other game.",
      "story": [
        "The first jigsaws were maps. John Spilsbury, a London map engraver, glued maps onto wood and cut them along the country borders so children could learn geography. He was advertising himself as a map dissector by 1763, and his Europe divided into its kingdoms, dated 1766, is the earliest known purpose-made jigsaw puzzle. The royal governess Lady Charlotte Finch used dissected maps to teach the children of King George III.",
        "The name came later. Around 1880 puzzle makers switched to fretsaws and treadle scroll saws, and the term jigsaw puzzle was in use by 1906. Pictures replaced maps, and puzzles stopped being only for children.",
        "Adults caught the bug in the United States from 1907 to 1910, starting in the north-east, though nobody agrees exactly where. In November 1908 the New-York Tribune reported that fashionable people and brain workers were hooked, that bridge whist suffered, and that homemade puzzles sold for three or four dollars. The paper said the craze began the previous winter among wealthy people in Newport, Rhode Island, and denied a story that a Boston girl had started it. A 500-piece wooden puzzle cost five dollars when many workers earned fifty dollars a month.",
        "Parker Brothers of Salem, Massachusetts, began advertising its Pastime puzzles in July 1908. In 1909 the firm stopped making games altogether, employed 300 workers and rented another building just to cut puzzles. The craze reached London by 1909, when Raphael Tuck and Sons began its Zag-Zaw puzzles for adults, and a second boom came in the Great Depression."
      ],
      "howToPlay": [
        "Tip the pieces out face up and turn over any that are face down.",
        "Sort out the edge pieces, which have at least one straight side, and build the frame first.",
        "Group the remaining pieces by colour or pattern, such as sky, water or faces.",
        "Work on one area at a time, using the picture on the box to guide you.",
        "Keep going until every piece is in place. Early wooden puzzles had no picture on the box and pieces that did not interlock, which made them much harder."
      ],
      "didYouKnow": [
        "Spilsbury's first puzzles were maps cut along borders, so each piece was a whole country.",
        "In early 1933, during the Depression, Americans were buying about ten million jigsaw puzzles a week.",
        "Pastime cutters at Parker Brothers were paid by the piece and cut around 1,400 pieces a day.",
        "The largest jigsaw by piece count was assembled in Vietnam in 2011 with 551,232 pieces."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Jigsaw puzzle - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Jigsaw_puzzle",
          "note": "Spilsbury c. 1760, Lady Charlotte Finch, name c. 1880 and 1906, craze 1907 to 1910, Depression, records"
        },
        {
          "title": "John Spilsbury (cartographer) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/John_Spilsbury_(cartographer)",
          "note": "1739 to 1769, advertised as engraver and map dissector in wood in 1763, 1766 Europe map believed first purpose-made jigsaw"
        },
        {
          "title": "Jeanne-Marie Leprince de Beaumont - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Jeanne-Marie_Leprince_de_Beaumont",
          "note": "Governess in London; wooden maps mentioned in letters of 1759 and 1762, before Spilsbury"
        },
        {
          "title": "Pastime Puzzles - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Pastime_Puzzles",
          "note": "July 1908 ads, 1909 puzzles only with 300 workers, 1,400 pieces a day, ended 1958"
        },
        {
          "title": "Jigsaw Puzzle History by Anne D. Williams - MGC Puzzles",
          "url": "https://www.mgcpuzzles.com/mgcpuzzles/puzzle_history/index.htm",
          "note": "$5 for 500 pieces in 1908 against $50 monthly wages, high society, 10 million a week in 1933"
        },
        {
          "title": "The picture jigsaw puzzle fad of 1908 - Click Americana",
          "url": "https://clickamericana.com/eras/1900s/the-picture-jigsaw-puzzle-fad-1908",
          "note": "New-York Tribune 15 November 1908 report: brain workers, bridge whist, $3 or $4 prices, Newport origin and Boston story denied, Collier's on Parker Brothers"
        },
        {
          "title": "1900 to 1930 hand-cut puzzles - Bob Armstrong, oldpuzzles.com",
          "url": "https://www.oldpuzzles.com/examples-collection/1900-1930-hand-cut-puzzles",
          "note": "Craze began in eastern Massachusetts in 1907, reached Boston and other cities by spring 1908 and London by 1909"
        },
        {
          "title": "Raphael Tuck and Sons - Bob Armstrong, oldpuzzles.com",
          "url": "https://www.oldpuzzles.com/node/1429",
          "note": "Tuck of London began hand-cut adult puzzles when the craze hit in 1908 and started the Zag-Zaw line in 1909"
        }
      ],
      "uncertainties": [
        "A French educator working as a governess in London, Jeanne-Marie Leprince de Beaumont, mentioned using wooden maps to teach children in letters of 1759 and 1762, before Spilsbury's commercial puzzles, so he may not have been the very first.",
        "Accounts of where the adult craze began disagree. The 1908 New-York Tribune said Newport, Rhode Island, and denied a Boston origin, while also mentioning a story about a boy in Providence. The collector Bob Armstrong traces it to a young woman in eastern Massachusetts in 1907 who cut up magazine covers for a children's hospital fair, with the fad reaching Boston by spring 1908. The two reviewers also split on this, so the story reports the dispute rather than naming one town.",
        "Wikipedia dates the adult craze 1907 to 1910; Anne Williams says adult puzzles emerged around 1900 with a full craze by 1908.",
        "Click Americana quotes a figure of 225 puzzle cutters making 15,000 puzzles a week at Parker Brothers in 1909; the Wikipedia Pastime Puzzles article says 300 workers, and that figure is used.",
        "Trove and Australian museum collection sites were not reachable, so the arrival of the craze in Australia could not be confirmed; a search listing showed Argus jigsaw articles from 1933 and 1934 that could not be opened."
      ],
      "nameNotes": "Pastime Puzzles was a Parker Brothers brand; use the generic jigsaw puzzle.",
      "confidence": "high",
      "playable": false,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "word-cross-1913",
      "title": "Word-Cross",
      "era": "1910s",
      "year": 1913,
      "yearLabel": "21 December 1913",
      "origin": "Arthur Wynne, New York World newspaper, USA (born Liverpool, England)",
      "blurb": "Fill a diamond of white squares with words from numbered clues, as readers of a New York Sunday paper first did on 21 December 1913.",
      "story": [
        "Arthur Wynne was born in Liverpool, England, on 22 June 1871 and sailed for the United States in 1891, aged 19. He worked on the Pittsburgh Press and then made the puzzle page for the Fun section of the Sunday New York World. For the 21 December 1913 issue he drew a diamond-shaped grid with a hollow centre and the letters F-U-N already filled in.",
        "He called it a Word-Cross Puzzle. A few weeks later someone at the paper, by accident, flipped the name to Cross-Word, and it stuck. Word squares and a puzzle by Giuseppe Airoldi in Italy in 1890 came earlier, but Wynne's numbered clues and boxes, and the black squares he added in later puzzles, made the modern crossword.",
        "The craze came in 1924, when the new publishers Simon and Schuster printed the first crossword book with a pencil attached. It sold in huge numbers. That year an editorial in The New York Times called the puzzles a sinful waste of time spent on the utterly futile finding of words. The Sunday Express became the first British newspaper to print a crossword, an adapted Wynne puzzle, on 2 November 1924.",
        "Australia followed within weeks. Sydney's Evening News printed the first recognisable Australian crossword on 10 December 1924 as part of a competition, and the Sunday Times offered cash and land prizes from 1 February 1925. One Adelaide paper in January 1925 called crosswords a new sort of plague sweeping through home life."
      ],
      "howToPlay": [
        "Each clue names two numbers. The answer runs from the first numbered cell to the second.",
        "Type a letter in each cell. Use the arrow keys to move around.",
        "Check your answers when you are done, or reveal a word if you are stuck."
      ],
      "didYouKnow": [
        "The first crossword was diamond-shaped with a hole in the middle, and the word FUN was filled in for you.",
        "The name Cross-Word came about by accident a few weeks after the first puzzle, when Wynne's Word-Cross was printed back to front.",
        "Simon and Schuster's first crossword book in 1924 came with a pencil attached.",
        "Australia's first newspaper crossword appeared in Sydney's Evening News on 10 December 1924."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Crossword - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Crossword",
          "note": "Wynne 21 December 1913, name reversal by an illustrator, Airoldi 1890, Simon and Schuster 1924 with pencil, NYT 1924 editorial, Sunday Express 2 November 1924, Pearson's February 1922"
        },
        {
          "title": "Arthur Wynne - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Arthur_Wynne",
          "note": "Birth 22 June 1871 Liverpool, emigration 1891 aged 19, Pittsburgh Press, created the Fun section puzzle page, diamond grid with FUN, typesetting error, later black squares, death 1945"
        },
        {
          "title": "Which Australian newspaper was the first to publish a crossword? - B. D. Hurkett (Trove research)",
          "url": "https://bdhurkett.wordpress.com/2014/07/23/which-australian-newspaper-was-the-first-to-publish-a-crossword/",
          "note": "Evening News 10 December 1924, Sunday Times 1 February 1925, Queenslander, Perth Mirror, Adelaide plague quote"
        }
      ],
      "uncertainties": [
        "Wikipedia says the Sunday Express was the first British newspaper to print a crossword, but also records, via Tony Augarde, a crossword in Pearson's Magazine in February 1922.",
        "The Australian first is based on a blogger's Trove search in 2014; earlier puzzles in papers not yet digitised cannot be ruled out. The Trove articles the blog links to could not be opened during editing because the site was behind a bot check.",
        "Wikipedia's Crossword article says an illustrator reversed the name; the Arthur Wynne article calls it a typesetting error. No primary source was found for either, so the story says only that it happened by accident."
      ],
      "nameNotes": "Crossword is generic. Avoid naming current newspaper puzzle brands.",
      "confidence": "high",
      "playable": true,
      "realLife": false,
      "kind": "game"
    },
    {
      "id": "battleship",
      "title": "Battleships",
      "era": "1910s",
      "year": 1914,
      "yearLabel": "c. 1910s; first published as Salvo in 1931",
      "origin": "Unknown; pencil and paper game said to be played by Russian officers around the First World War",
      "blurb": "Hide your fleet on a grid and call out squares to sink your opponent's ships, a pencil and paper game that Russian officers are said to have played around the First World War.",
      "story": [
        "Nobody knows who invented Battleships. It is a pencil and paper game that dates from around the First World War, and it is often said that Russian officers played it on hand-drawn grids around that time. A diary kept by the Russian poet Ryurik Ivnev is said to mention the game being played as early as 1907. People drew their own grids and hid their ships with a pencil.",
        "Even earlier, in 1890, the American company E. I. Horsman sold a game called Basilinda, in which players hid wooden pegs behind a cardboard screen. Historians see it as a cousin of Battleships, though not the same game.",
        "The first printed version was Salvo, published in 1931 in the United States by the Starex Novelty Company. It came as pads of printed grids. In Salvo you fired several shots at once, one for each ship you still had afloat. Other pad versions followed in the 1930s and 1940s, including Milton Bradley's Broadsides in 1943.",
        "In 1967 Milton Bradley turned it into the plastic board game with pegs and little ships, advertised during Saturday morning cartoons. An Electronic Battleship with sounds followed in 1977. The plastic version has sold more than 100 million copies, and it entered the National Toy Hall of Fame in 2025."
      ],
      "howToPlay": [
        "Each player draws two 10 by 10 grids, with letters across the top and numbers down the side. One grid is your ocean, the other is for tracking your shots.",
        "Secretly mark your ships on your ocean grid: a carrier of 5 squares, a battleship of 4, a cruiser of 3, a submarine of 3 and a destroyer of 2. Ships go in straight lines and may not overlap.",
        "Take turns calling a square, such as B7. Your opponent says hit or miss, and must say when a ship is sunk.",
        "Mark hits and misses on your tracking grid so you can hunt down damaged ships.",
        "The first player to sink all five enemy ships wins. For the 1931 Salvo rules, fire one shot per surviving ship each turn."
      ],
      "didYouKnow": [
        "The original 1931 Salvo pads let you fire up to five shots a turn, one for each ship you had left.",
        "A Russian poet's diary is said to mention the game as early as 1907, years before any company printed it.",
        "The 1977 Electronic Battleship was an early toy built around a microprocessor, and it made sounds.",
        "The plastic Battleship game has sold more than 100 million copies since 1967."
      ],
      "computer": "",
      "sources": [
        {
          "title": "Battleship (game) - Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Battleship_(game)",
          "note": "Pencil and paper origins, Russian officers before the war, Ivnev 1907 diary, Basilinda 1890, Salvo 1931 by the Starex company in the United States, 1967 and 1977 editions, microprocessor, grid and ship sizes"
        },
        {
          "title": "Battleship - The Strong National Museum of Play",
          "url": "https://www.museumofplay.org/toys/battleship/",
          "note": "Basilinda 1890, Russian officers during WWI, Starex Novelty Company Salvo 1931, Broadsides 1943, 1967 plastic game and Saturday morning cartoons, 100 million sales, Hall of Fame 2025"
        }
      ],
      "uncertainties": [
        "The Russian officer story rests on a 1931 Milwaukee Journal article cited by Wikipedia that is a dead link and could not be opened.",
        "The Ivnev 1907 diary entry is cited by Wikipedia; the Prozhito corpus page would not load, so the exact wording and date were not checked.",
        "Wikipedia says Russian officers played before the war; the Strong Museum says during the war, so the story says around that time.",
        "Neither source gives a location for the Starex Novelty Company, so the draft's New York was removed. Wikipedia gives no year for Broadsides, only the 1930s and 1940s; the 1943 date comes from The Strong.",
        "No Australian source could be checked because Trove was blocked by a bot check."
      ],
      "nameNotes": "Battleship is a Hasbro trademark for the board game. Use Battleships or the pencil and paper game in titles, and do not use Hasbro's box art.",
      "confidence": "low",
      "playable": false,
      "realLife": false,
      "kind": "game"
    }
  ],
  "kids": [
    {
      "era": "1800s",
      "title": "Being 12 in the 1800s",
      "paragraphs": [
        "School was not compulsory for most of this period. Victoria's Education Act of December 1872 was Australia's first free, secular and compulsory system, covering ages 6 to 15. On the 1850s goldfields, tent schools held about 100 pupils from 9am to 5pm, and teachers collected fees in advance. In England the 1870 Act built board schools, but attendance only became compulsory nationwide in 1880.",
        "Many children worked. Britain's 1833 Factory Act let children aged 9 to 13 work in textile mills, but for no more than eight hours a day and 48 hours a week, with two hours of schooling each day. The 1842 Mines Act banned boys under 10 from going underground after an inquiry found five-year-olds opening ventilation doors. On Australian goldfields children ran errands for diggers, searched waste heaps for gold, and poorer families made toys such as rag dolls and jacks from sheep bones.",
        "Evenings were dark. Sydney's first gas street lamps were lit on 24 May 1841, but gas did not reach ordinary suburban homes until the 1870s; most families used candles or, from the 1860s, imported kerosene lamps. Travel meant walking, horses or a Cobb & Co coach: the company was founded in Melbourne in 1853 and by early 1854 ran a daily coach to Forest Creek and Bendigo. Australia's first steam railway opened in Melbourne in 1854. Penny dreadfuls, boys' story papers, cost one penny.",
        "Twelve-year-old Lucy Birchall (also spelt Burchall) wrote to her grandmother in 1855 about travelling by dray from Melbourne to Bendigo, where she washed 'about a pennyweight of gold' and went to school. Children of her generation remembered the 1851 gold rushes, the Eureka Stockade in December 1854, the last convict ships in 1868, and the Overland Telegraph, which from 1872 carried news from London in hours instead of months."
      ],
      "fastFacts": [
        "Victoria 1872: first Australian colony with free, compulsory, secular schooling, ages 6 to 15 (Old Treasury Building; Wikipedia).",
        "UK Factory Act 1833: children aged 9 to 13 limited to 8 hours a day and 48 hours a week in textile mills, plus 2 hours' schooling a day (Wikipedia).",
        "Mines Act 1842 banned boys under 10 and all women and girls from working underground in Britain (Wikipedia).",
        "Sydney's gas street lamps were first lit on 24 May 1841, Queen Victoria's birthday (Wikipedia, AGL).",
        "Marjory Fleming of Kirkcaldy kept a diary aged 7 to 8 (1810 to 1811), reading novels and her Bible (Wikipedia).",
        "Penny dreadfuls from 1836: 8 to 16 pages for one penny; working-class boys formed clubs to share copies (Wikipedia)."
      ],
      "compare": "In the 1850s a goldfields tent school ran from 9am to 5pm and parents paid the teacher in advance. How is your school day different, and who pays for it now?",
      "sources": [
        {
          "title": "Education Act 1872 (Victoria), Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Education_Act_1872_(Victoria)",
          "note": "Date 17 December 1872; free, secular, compulsory"
        },
        {
          "title": "Children at work, Old Treasury Building Melbourne",
          "url": "https://www.oldtreasurybuilding.org.au/lost-jobs/children-at-work/",
          "note": "1872 Act compulsory ages 6 to 15; child work details"
        },
        {
          "title": "Children on the goldfields, State Library Victoria (ergo)",
          "url": "https://ergo.slv.vic.gov.au/explore-history/golden-victoria/life-fields/children",
          "note": "Tent schools of about 100 pupils, 9am to 5pm, fees in advance; Lucy Birchall letter 1855 (MS 9328), pennyweight of gold, started school"
        },
        {
          "title": "Children of the Gold Rush, Goldfields Guide",
          "url": "https://www.goldfieldsguide.com.au/blog/24/children-of-the-gold-rush",
          "note": "Spells the name Burchall; gives her age as 12 and the dray journey, 1855"
        },
        {
          "title": "Play, pan, repeat: Childhood on the goldfields, Sovereign Hill",
          "url": "https://www.sovereignhill.com.au/stories/play-pan-repeat-childhood-on-the-goldfields/",
          "note": "Homemade toys, hoops, marbles, tent schools"
        },
        {
          "title": "Elementary Education Act 1870, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Elementary_Education_Act_1870",
          "note": "Board schools; compulsory nationwide from 1880; free from 1891"
        },
        {
          "title": "Factory Acts, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Factory_Acts",
          "note": "1833 Act: age 9 minimum, 8 hours a day, 48 hours a week, 2 hours schooling"
        },
        {
          "title": "Factory Act 1833, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Factory_Act_1833",
          "note": "Ages 9 to 13: no more than 8 hours a day, 48 hours a week; schoolmaster's certificate of two hours' education a day"
        },
        {
          "title": "Mines and Collieries Act 1842, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Mines_and_Collieries_Act_1842",
          "note": "Boys under 10 and all females banned underground; trappers aged 5 or 6"
        },
        {
          "title": "Australian Gas Light Company, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Australian_Gas_Light_Company",
          "note": "Sydney gas lamps lit 24 May 1841"
        },
        {
          "title": "Gas hall light, Museums of History NSW",
          "url": "https://mhnsw.au/stories/general/gas-hall-light/",
          "note": "Gas not common in suburban homes until the 1870s"
        },
        {
          "title": "Kerosene lamp, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Kerosene_lamp",
          "note": "Modern kerosene lamp 1853"
        },
        {
          "title": "Cobb & Co, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Cobb_%26_Co",
          "note": "Founded Melbourne 1853; daily coach to Forest Creek and Bendigo by early 1854; last coach 1924"
        },
        {
          "title": "Rail transport in Australia, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Rail_transport_in_Australia",
          "note": "Melbourne to Sandridge steam railway 1854 (South Australia had a horse-drawn line in 1853); Sydney to Parramatta 1855"
        },
        {
          "title": "Penny dreadful, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Penny_dreadful",
          "note": "From 1836, one penny, boys' clubs"
        },
        {
          "title": "Marjory Fleming, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Marjory_Fleming",
          "note": "Born 15 January 1803, died 19 December 1811; diary covers her last 18 months; 'I read Novelettes and my bible'"
        },
        {
          "title": "Victorian gold rush, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Victorian_gold_rush",
          "note": "1851 start; Eureka 3 December 1854; population figures"
        },
        {
          "title": "History of Australia (1851 to 1900), Wikipedia",
          "url": "https://en.wikipedia.org/wiki/History_of_Australia_(1851%E2%80%931900)",
          "note": "Transportation phased out to 1868"
        },
        {
          "title": "Australian Overland Telegraph Line, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Australian_Overland_Telegraph_Line",
          "note": "Joined 22 August 1872; London messages in hours"
        }
      ],
      "uncertainties": [
        "The Wikipedia stub for the 1872 Victorian Act does not state the compulsory ages; the 6 to 15 range comes from the Old Treasury Building page.",
        "State Library Victoria, which holds the 1855 letter (MS 9328), spells the writer 'Lucy Birchall'; the Goldfields Guide blog uses 'Burchall'. The panel follows SLV. Her age (12) and the dray journey from Melbourne come only from Goldfields Guide; SLV confirms the pennyweight of gold and that she had started school.",
        "The 1833 Factory Act daily limit for ages 9 to 13 is given as 8 hours on the Wikipedia pages opened; the Act's own wording is often quoted as 9 hours a day. The 48-hour weekly limit and the two hours of schooling a day are consistent across sources.",
        "Marjory Fleming was younger than 10 and Scottish; no Australian diary by a 10 to 14 year old from before 1850 was found in an opened source.",
        "The kerosene lamp import date (1860s) appeared in a search summary of Victorian Collections, which could not be opened; the 1853 lamp date is from Wikipedia."
      ]
    },
    {
      "era": "1880s",
      "title": "Being 12 in the 1880s",
      "paragraphs": [
        "By the 1880s school was the law. New South Wales's Public Instruction Act came into force in May 1880: children aged 6 to 14 had to attend at least 70 days each half-year, and government school enrolments jumped 25 per cent that year. Fees were still charged until 1906. In England the 1880 Act made attendance compulsory to age 10, and in 1881 nearly 23 per cent of boys aged 10 to 14 were working.",
        "Work was still common. Jack Lang, later Premier of New South Wales, sold newspapers in Sydney mornings and afternoons as a boy in the 1880s and left school at 14. In Victoria an 1884 inquiry heard of a seven-year-old on a factory floor and a child rope worker paid 7 shillings for a 50-hour week. The 1885 Factories and Shops Act then banned factory work under 13 and limited under-16s to 48 hours.",
        "Lighting was changing. Gas reached Sydney suburban homes in the 1870s, and on 9 November 1888 Tamworth became the first Australian town with council-owned electric street lights. Melbourne's first cable tram ran on 11 November 1885, and the Rover safety bicycle appeared in England the same year. The Boy's Own Paper (1879) and Girl's Own Paper (1880) each cost one penny a week.",
        "In 1870, 42 per cent of Melbourne's people were under 14 and the city had no playgrounds, so children played, sold and gathered in streets and vacant lots; newspapers called the rowdy ones larrikins. Big memories: the Melbourne International Exhibition of 1880 to 1881 with 1.459 million visitors, Ned Kelly hanged on 11 November 1880, and the 1888 centenary of British settlement."
      ],
      "fastFacts": [
        "NSW 1880: compulsory school for ages 6 to 14, at least 70 days each half-year (NSW Department of Education).",
        "England 1880: attendance compulsory to age 10; in 1881, 22.9 per cent of boys aged 10 to 14 worked (Wikipedia).",
        "Victoria's 1885 Factories and Shops Act: no factory work under 13; 48-hour week for under-16s (Old Treasury Building).",
        "Ethel Turner arrived aged 9 in 1879, attended Paddington Public School, then Sydney Girls High's first intake in 1883 (Wikipedia).",
        "Melbourne's first cable tram ran 11 November 1885, Bourke Street to Hawthorn Bridge (Wikipedia).",
        "Tamworth switched on Australia's first council-owned electric street lights on 9 November 1888 (Wikipedia)."
      ],
      "compare": "In 1884 a Melbourne child rope worker earned 7 shillings for a 50-hour week while an adult man earned about £2. What rules protect young workers today, and who decided them?",
      "sources": [
        {
          "title": "Public Instruction Act 1880, NSW Department of Education",
          "url": "https://education.nsw.gov.au/about-us/history-of-nsw-government-schools/government-schools/public-instruction-act-1880",
          "note": "May 1880; ages 6 to 14; 70 days per half-year; 25 per cent enrolment rise"
        },
        {
          "title": "Attendance, NSW Department of Education",
          "url": "https://education.nsw.gov.au/about-us/history-of-nsw-government-schools/facts-and-figures/attendance",
          "note": "1880 exemptions; 1916 daily attendance"
        },
        {
          "title": "Education, Dictionary of Sydney",
          "url": "https://dictionaryofsydney.org/entry/education",
          "note": "Fees until 1906; Peter Board fee waivers"
        },
        {
          "title": "Children, Dictionary of Sydney",
          "url": "https://dictionaryofsydney.org/entry/children",
          "note": "Jack Lang selling papers at seven in the 1880s; street games; beaches"
        },
        {
          "title": "Jack Lang (Australian politician), Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Jack_Lang_(Australian_politician)",
          "note": "Born 1876; sold newspapers; left school at 14"
        },
        {
          "title": "Children at work, Old Treasury Building Melbourne",
          "url": "https://www.oldtreasurybuilding.org.au/lost-jobs/children-at-work/",
          "note": "1884 inquiry; 7s for 50 hours; adult male £2 to £2 10s; 1885 Act provisions"
        },
        {
          "title": "Raising of school leaving age in England and Wales, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Raising_of_school_leaving_age_in_England_and_Wales",
          "note": "1880 compulsory to 10"
        },
        {
          "title": "Child labour, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Child_labour",
          "note": "England and Wales 1881: 22.9 per cent of boys 10 to 14 working"
        },
        {
          "title": "Ethel Turner, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Ethel_Turner",
          "note": "Arrived 1879; Paddington Public; one of 37 original SGHS pupils"
        },
        {
          "title": "Sydney Girls High School, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Sydney_Girls_High_School",
          "note": "Opened 1883; Ethel Turner in first enrolment"
        },
        {
          "title": "Gas hall light, Museums of History NSW",
          "url": "https://mhnsw.au/stories/general/gas-hall-light/",
          "note": "Gas in suburban homes from 1870s; Welsbach burner 1885"
        },
        {
          "title": "Tamworth, New South Wales, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Tamworth,_New_South_Wales",
          "note": "Electric street lighting 9 November 1888"
        },
        {
          "title": "Trams in Melbourne, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Trams_in_Melbourne",
          "note": "Horse tram 1884; cable tram 11 November 1885"
        },
        {
          "title": "Safety bicycle, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Safety_bicycle",
          "note": "Rover 1885"
        },
        {
          "title": "The Boy's Own Paper, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/The_Boy%27s_Own_Paper",
          "note": "18 January 1879; one penny weekly"
        },
        {
          "title": "Girl's Own Paper, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Girl%27s_Own_Paper",
          "note": "3 January 1880; one penny"
        },
        {
          "title": "How the kids of Melbourne fought for their playgrounds, ABC Radio National",
          "url": "https://abc.net.au/radionational/archived/bydesign/how-the-kids-of-melbourne-fought-for-playgrounds/4903036",
          "note": "1870: 42 per cent under 14; no playgrounds; larrikins"
        },
        {
          "title": "Larrikin, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Larrikin",
          "note": "Term in Melbourne from late 1860s; 1870 press complaint"
        },
        {
          "title": "Melbourne International Exhibition, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Melbourne_International_Exhibition",
          "note": "1 October 1880 to 30 April 1881; 1.459 million visitors; 1888 Centennial"
        },
        {
          "title": "Ned Kelly, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Ned_Kelly",
          "note": "Hanged 11 November 1880"
        }
      ],
      "uncertainties": [
        "A search snippet from the NSW Department of Education gave 1880 school fees as 3d per child per week, maximum 1s per family, but the page as fetched did not confirm the figures.",
        "Waratah, Tasmania, had commercially owned electric street lights in 1886; Tamworth's claim is for the first municipally owned system.",
        "Jack Lang's age when he began selling papers is given as seven by the Dictionary of Sydney; Wikipedia gives no starting age.",
        "The 1884 wage figures are for Victoria; no equivalent dated child wage for NSW was found in an opened source."
      ]
    },
    {
      "era": "1890s",
      "title": "Being 12 in the 1890s",
      "paragraphs": [
        "School was compulsory in every Australian colony, though many children still missed days to work. Miles Franklin, born 1879, was taught at home until 1889 and then attended Thornford Public School near Goulburn, where her teacher encouraged her writing. In England schooling became free in 1891 and the leaving age rose to 11 in 1893 and 12 in 1899. Ethel Turner's Seven Little Australians (1894) was an instant hit.",
        "The 1890s were hard. Eleven banks had closed their doors by 17 May 1893 and the economy shrank by about 20 per cent between 1891 and 1895. Melbourne flower boys earned 5 to 15 shillings a week; NSW's 1896 Factories and Shops Act limited children's hours to help school attendance. In New York, newsboys bought papers at 50 cents a hundred, sold them for a cent each, and struck in 1899 when the price rose.",
        "Anthony Hordern's Sydney catalogue of 1894 listed draughtsmen from 6d a set, washable dolls from 1s, and games including Ludo, Lotto, Reversi and tiddlywinks. By 1900 stone marbles were 30 for a penny and a draughts set with board cost 6d. Sydney had steam trams from 1879 and electric trams from 1898; Melbourne's cable trams ran on 75 kilometres of double track. Most homes still lit kerosene or gas lamps.",
        "Children played in streets, on beaches such as Bondi and Coogee, and in parks. In 1896 the curator of Melbourne's Carlton Gardens found a secret play space the local children had made and chose to support it. Big memories: gold at Coolgardie in 1892 and Kalgoorlie in 1893, the shearers' strikes of 1891 and 1894, Federation referendums in 1898 and 1899, and the Boer War from October 1899."
      ],
      "fastFacts": [
        "England: school fees abolished 1891; leaving age 11 in 1893 and 12 in 1899 (Wikipedia).",
        "Eleven Australian banks had closed by 17 May 1893; Victoria declared a five-day bank holiday (Wikipedia).",
        "1894 Hordern catalogue, Sydney: draughtsmen 6d to 3s a set; washable dolls 1s to 7s 6d (Internet Archive scan).",
        "1900 Hordern catalogue: stone marbles 30 for 1d; draughts and board 6d, 1s, 1s 9d; Halma 1s (Internet Archive scan).",
        "Melbourne flower boys earned 5 to 15 shillings a week in the 1890s (Old Treasury Building).",
        "New York newsboys paid 50 cents per 100 papers and sold each for a cent; strike July to August 1899 (Wikipedia)."
      ],
      "compare": "In 1900 one penny bought 30 marbles and a draughts set cost 6d, while a flower boy earned 5 to 15 shillings a week. Work out how many hours a child worked for a game then, and how many you would now.",
      "sources": [
        {
          "title": "Miles Franklin, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Miles_Franklin",
          "note": "Born 1879; Thornford Public School from 1889; My Brilliant Career 1901"
        },
        {
          "title": "Ethel Turner, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Ethel_Turner",
          "note": "Seven Little Australians 1894"
        },
        {
          "title": "Raising of school leaving age in England and Wales, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Raising_of_school_leaving_age_in_England_and_Wales",
          "note": "1893 age 11; 1899 age 12"
        },
        {
          "title": "Elementary Education Act 1870, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Elementary_Education_Act_1870",
          "note": "Free from 1891"
        },
        {
          "title": "Australian banking crisis of 1893, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Australian_banking_crisis_of_1893",
          "note": "11 banks closed by 17 May 1893; bank holiday 1 May"
        },
        {
          "title": "History of Australia (1851 to 1900), Wikipedia",
          "url": "https://en.wikipedia.org/wiki/History_of_Australia_(1851%E2%80%931900)",
          "note": "Economy contracted 20 per cent 1891 to 1895; shearers' strikes 1891 and 1894; maritime strike 1890"
        },
        {
          "title": "Children at work, Old Treasury Building Melbourne",
          "url": "https://www.oldtreasurybuilding.org.au/lost-jobs/children-at-work/",
          "note": "Flower boys 5 to 15s a week in the 1890s; newsboys from age 7"
        },
        {
          "title": "Children, Dictionary of Sydney",
          "url": "https://dictionaryofsydney.org/entry/children",
          "note": "1896 Factories and Shops Act; beaches; street rhymes"
        },
        {
          "title": "Newsboys' strike of 1899, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Newsboys%27_strike_of_1899",
          "note": "50 to 60 cents per hundred; 18 July to 2 August 1899"
        },
        {
          "title": "Anthony Hordern and Sons' catalogue 1894, Internet Archive (OCR text)",
          "url": "https://archive.org/details/Hordern14144",
          "note": "Dolls and toys pages; draughtsmen per set 6d to 3s; games list"
        },
        {
          "title": "Anthony Hordern & Sons' catalogue 1900, Internet Archive (OCR text)",
          "url": "https://archive.org/details/Hordern14142",
          "note": "Marbles 30 for 1d; draughts and board 6d; Halma 1s; dominoes from 10d"
        },
        {
          "title": "Trams in Sydney, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Trams_in_Sydney",
          "note": "Steam trams 1879; electric from 1898"
        },
        {
          "title": "Trams in Melbourne, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Trams_in_Melbourne",
          "note": "75 km of double track at peak"
        },
        {
          "title": "Gas hall light, Museums of History NSW",
          "url": "https://mhnsw.au/stories/general/gas-hall-light/",
          "note": "Gas and kerosene in homes; electricity in Sydney in stages from the 1890s"
        },
        {
          "title": "How the kids of Melbourne fought for their playgrounds, ABC Radio National",
          "url": "https://abc.net.au/radionational/archived/bydesign/how-the-kids-of-melbourne-fought-for-playgrounds/4903036",
          "note": "Carlton Gardens 1896 secret play space"
        },
        {
          "title": "Australian gold rushes, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Australian_gold_rushes",
          "note": "Coolgardie 1892; Kalgoorlie 1893"
        },
        {
          "title": "Federation of Australia, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Federation_of_Australia",
          "note": "Referendums June 1898 and 1899"
        },
        {
          "title": "Second Boer War, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Second_Boer_War",
          "note": "11 October 1899 to 31 May 1902"
        },
        {
          "title": "Safety bicycle, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Safety_bicycle",
          "note": "1890s bike boom"
        }
      ],
      "uncertainties": [
        "Catalogue prices come from Internet Archive OCR text, which is imperfect; prices were read where the digits were clear (for example '-/6' meaning sixpence).",
        "The 1894 catalogue names Ludo, Lotto, Reversi and tiddlywinks but their individual prices were not legible in the OCR.",
        "The catalogue dates (1894, 1900) are those assigned by the Internet Archive record.",
        "The newsboys' strike is a US example; Trove articles on Sydney and Melbourne newsboys could not be opened because the site blocks automated readers."
      ]
    },
    {
      "era": "1900s",
      "title": "Being 12 in the 1900s",
      "paragraphs": [
        "Primary school fees in New South Wales ended with the Free Education Act of 8 October 1906, and attendance in post-primary classes rose from 708 in 1906 to 10,833 in 1910. Peter Board, who as a head teacher in the 1880s had asked repeatedly for fee waivers for poor families, led the department from 1905. In the USA, Massachusetts had required schooling since 1852, but Mississippi did not until 1918.",
        "Children still worked. In 1902 a Victorian council paid tuppence for every rat children caught, and girls as young as 10 or 11 began work as maids. Melbourne newsboys as young as seven sold papers in the streets. In the United States about 1.7 million children under 15 were employed in 1900, and the National Child Labor Committee was formed in 1904 to campaign against it.",
        "On 8 July 1904 the Lady Mayoress switched on Sydney's first 343 electric street lamps, powered from Pyrmont, though homes mostly kept gas or kerosene. Electric trams ran from St Kilda to Brighton from May 1906; Australia's first imported car arrived in 1897 and Harley Tarrant built a petrol car in Melbourne in 1901. Hordern's 1907 catalogue priced Ludo at 6d and a games compendium with tiddlywinks at 1s 9d.",
        "By 1907 the playground movement was working to move children off the streets into parks, football and cricket. The first informal Scout troops formed in Australia that same year, and Scouting was formally established in 1908. Fanny Durack, born 1889, learned to swim at Coogee Baths and in 1912 became Australia's first female Olympic swimming champion. Big memories: Federation on 1 January 1901, the Federation Drought that peaked in 1902, and films such as The Story of the Kelly Gang (1906)."
      ],
      "fastFacts": [
        "NSW abolished primary and superior public school fees on 8 October 1906 (Museums of History NSW).",
        "Sydney's first 343 electric street lights were switched on 8 July 1904, powered from Pyrmont (Engineers Australia).",
        "1902: a Victorian council paid children 2d for every rat caught (Old Treasury Building).",
        "USA 1900: about 1.7 million children under 15 were employed; over 2 million by 1910 (Wikipedia).",
        "Hordern's 1907 catalogue: Ludo 6d, 1s or 2s; Halma 1s; compendium with tiddlywinks 1s 9d (Internet Archive scan).",
        "Scouting began in Australia with informal troops in 1907 and was formally established in 1908; Guide groups formed from 1909 (Wikipedia)."
      ],
      "compare": "NSW made primary school free in 1906 and higher-class attendance jumped from 708 to 10,833 by 1910. What stops some children going to school today, here and in other countries?",
      "sources": [
        {
          "title": "Free education for children, 1906, Museums of History NSW",
          "url": "https://mhnsw.au/stories/on-this-day/8-oct-1906/",
          "note": "Free Education Act 8 October 1906; 708 to 10,833"
        },
        {
          "title": "Education, Dictionary of Sydney",
          "url": "https://dictionaryofsydney.org/entry/education",
          "note": "Peter Board; fees until 1906; 1880 and 1916 Acts"
        },
        {
          "title": "Compulsory education, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Compulsory_education",
          "note": "Massachusetts 1852; Mississippi 1918"
        },
        {
          "title": "Children at work, Old Treasury Building Melbourne",
          "url": "https://www.oldtreasurybuilding.org.au/lost-jobs/children-at-work/",
          "note": "1902 rat bounty 2d; maids at 10 to 11; newsboys from 7"
        },
        {
          "title": "Child labour, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Child_labour",
          "note": "US 1900 1.7 million; 1910 over 2 million"
        },
        {
          "title": "Child labor laws in the United States, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Child_labor_laws_in_the_United_States",
          "note": "National Child Labor Committee 1904; Keating-Owen 1916"
        },
        {
          "title": "City of Sydney Streetlighting, 1904, Engineers Australia heritage",
          "url": "https://portal.engineersaustralia.org.au/heritage/city-sydney-streetlighting-1904",
          "note": "8 July 1904; 343 lamps; Pyrmont"
        },
        {
          "title": "Gas hall light, Museums of History NSW",
          "url": "https://mhnsw.au/stories/general/gas-hall-light/",
          "note": "Gas lighting in suburban homes into the 1930s"
        },
        {
          "title": "Trams in Melbourne, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Trams_in_Melbourne",
          "note": "St Kilda to Brighton electric tram 5 May 1906"
        },
        {
          "title": "Automotive industry in Australia, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Automotive_industry_in_Australia",
          "note": "First import 1897; Tarrant petrol car 1901"
        },
        {
          "title": "Anthony Hordern and Sons' household catalogue 1907, Internet Archive (OCR text)",
          "url": "https://archive.org/details/Hordern_26774.",
          "note": "Ludo 6d, 1s, 2s; Halma 1s, 1s 7d; compendium 1s 9d"
        },
        {
          "title": "How the kids of Melbourne fought for their playgrounds, ABC Radio National",
          "url": "https://abc.net.au/radionational/archived/bydesign/how-the-kids-of-melbourne-fought-for-playgrounds/4903036",
          "note": "Playground movement by 1907"
        },
        {
          "title": "Scouting and Guiding in Australia, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Scouting_and_Guiding_in_Australia",
          "note": "Informal troops in Western Australia and Victoria 1907; formally established 1908"
        },
        {
          "title": "Girl Guides Australia, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Girl_Guides_Australia",
          "note": "Guide groups from 1909"
        },
        {
          "title": "Fanny Durack, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Fanny_Durack",
          "note": "Born 1889; Coogee Baths; 1912 gold"
        },
        {
          "title": "Federation of Australia, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Federation_of_Australia",
          "note": "1 January 1901, Centennial Park"
        },
        {
          "title": "Federation Drought, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Federation_Drought",
          "note": "1895 to 1902; April 1902 driest month"
        },
        {
          "title": "Cinema of Australia, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Cinema_of_Australia",
          "note": "First screenings 1896; Kelly Gang 1906"
        }
      ],
      "uncertainties": [
        "The 2d rat bounty is a Victorian council example; the Wikipedia page on Sydney's 1900 plague rat bounty could not be opened.",
        "Fanny Durack's exact age when she learned to swim at Coogee is not given on the page opened.",
        "The 1907 Hordern catalogue date is the Internet Archive's; OCR prices were read where clearly legible. The archive.org identifier genuinely ends with a full stop.",
        "Victoria's 1910 car registration figure (1,590) appeared only in a search snippet and is not included in the panel."
      ]
    },
    {
      "era": "1910s",
      "title": "Being 12 in the 1910s",
      "paragraphs": [
        "From 1 January 1911 every boy aged 12 to 14 was a junior cadet, doing 120 hours a year of drill and physical training at school with no uniform; senior cadets aged 14 to 18 wore uniform and learned musketry. A 1916 NSW amendment required school every day, two hours morning and two afternoon, for ages 7 to 14. England's 1918 Fisher Act raised the leaving age to 14 and ended half-time working.",
        "In 1915 a Victorian school inspector described a 13-year-old girl who rose at 4.30am, milked 14 cows, walked more than 4 km to school, milked 10 more after school and went to bed at 10.30pm. One Sydney girl started at David Jones at 14 for 10 shillings a 48-hour week. Hordern's 1914 catalogue sold Snakes and Ladders from 7d and Ludo from 6d.",
        "War shaped everything. Nearly 417,000 Australians enlisted and more than 60,000 died; Anzac Day marks the Gallipoli landing of 25 April 1915. Children knitted socks, collected scrap and gave pocket money. South Australia's Children's Patriotic Fund raised more than £150,000 and awarded a medal to any child who earned 10 shillings for it. Helen Fairley was 13 when war began and left school the following year.",
        "Homes had no radio: Australia's first station, 2SB Sydney, did not open until November 1923, so evenings meant lamps, books and board games. Cars needed number plates from 1910, and Harry Houdini made Australia's first controlled powered flight at Diggers Rest on 18 March 1910. Memories: Halley's Comet in May 1910, the conscription votes of 1916 and 1917, and the 1919 influenza, which closed schools and killed 12,000 to 15,000 Australians."
      ],
      "fastFacts": [
        "Junior cadets: boys 12 to 14 did 120 hours a year at school, no uniform, from 1 January 1911 (Kingston Local History; AWM).",
        "NSW 1916: school every day, two hours morning and two afternoon, ages 7 to 14 (NSW Department of Education).",
        "1915 inspector's report: a 13-year-old girl milked 24 cows a day around school (Old Treasury Building).",
        "Hordern's 1914 catalogue: Snakes and Ladders 7d, 1s, 1s 8d or 2s 6d; Ludo 6d (Internet Archive scan).",
        "1919 influenza: 12,000 to 15,000 Australian deaths; schools closed; for a time masks were compulsory in the street (The Conversation; University of Sydney).",
        "Australia's first radio station, 2SB Sydney, opened in November 1923, after this era (Wikipedia)."
      ],
      "compare": "In 1915 a 13-year-old milked 24 cows a day and still walked to school, while boys her age did 120 hours of cadet drill a year. Which of these would be impossible or illegal for you now, and why?",
      "sources": [
        {
          "title": "Military Training 1909, Kingston Local History",
          "url": "https://localhistory.kingston.vic.gov.au/articles/602",
          "note": "Junior cadets 12 to 14, 120 hours; senior cadets 14 to 18; start 1 January 1911"
        },
        {
          "title": "Compulsory military service, Australian War Memorial",
          "url": "https://www.awm.gov.au/visit/exhibitions/forging/security/service",
          "note": "Junior cadets 12 to 14 school-based; Kitchener visit"
        },
        {
          "title": "Conscription in Australia, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Conscription_in_Australia",
          "note": "Plebiscites 28 October 1916 and 20 December 1917; 1911 scheme ages 12 to 26"
        },
        {
          "title": "Attendance, NSW Department of Education",
          "url": "https://education.nsw.gov.au/about-us/history-of-nsw-government-schools/facts-and-figures/attendance",
          "note": "1916 Act: daily attendance, ages 7 to 14"
        },
        {
          "title": "Education Act 1918, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Education_Act_1918",
          "note": "Leaving age 14; half-time ended"
        },
        {
          "title": "Children at work, Old Treasury Building Melbourne",
          "url": "https://www.oldtreasurybuilding.org.au/lost-jobs/children-at-work/",
          "note": "1915 inspector report on 13-year-old dairy girl"
        },
        {
          "title": "How children experienced the First World War, Sir John Monash Centre",
          "url": "https://sjmc.gov.au/how-children-experienced-the-war/",
          "note": "417,000 enlisted; girl at 14 on 10s for 48 hours; knitting, scrap, pocket money"
        },
        {
          "title": "Military history of Australia during World War I, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Military_history_of_Australia_during_World_War_I",
          "note": "More than 60,000 dead; landing 25 April 1915"
        },
        {
          "title": "Patriotic Fund, Children and World War 1, State Library of South Australia",
          "url": "https://guides.slsa.sa.gov.au/c.php?g=410371&p=2794507",
          "note": "Over £150,000 raised; medal for earning 10s"
        },
        {
          "title": "Children and World War 1, State Library of South Australia",
          "url": "https://guides.slsa.sa.gov.au/children_WW1",
          "note": "Helen Fairley aged 13 in 1914, left school next year"
        },
        {
          "title": "Anthony Hordern & Sons general catalogue 1914, Internet Archive (OCR text)",
          "url": "https://archive.org/details/Hordern15027",
          "note": "Snakes and Ladders 7d to 2s 6d; Ludo 6d"
        },
        {
          "title": "ABC Radio Sydney, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/ABC_Radio_Sydney",
          "note": "2SB opened 13 November 1923, first public station"
        },
        {
          "title": "Radio in Australia, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Radio_in_Australia",
          "note": "2BL listed as 23 November 1923"
        },
        {
          "title": "Vehicle registration plates of Victoria, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_Victoria",
          "note": "Plates issued from 1910"
        },
        {
          "title": "Vehicle registration plates of New South Wales, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_New_South_Wales",
          "note": "Registration from 1910"
        },
        {
          "title": "Diggers Rest, Victoria, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Diggers_Rest,_Victoria",
          "note": "Houdini flight 18 March 1910"
        },
        {
          "title": "Halley's Comet, Wikipedia",
          "url": "https://en.wikipedia.org/wiki/Halley%27s_Comet",
          "note": "Naked-eye from 10 April 1910; Earth passed through tail 19 May"
        },
        {
          "title": "How Australia's response to the Spanish flu of 1919 sounds warnings, The Conversation",
          "url": "https://theconversation.com/how-australias-response-to-the-spanish-flu-of-1919-sounds-warnings-on-dealing-with-coronavirus-134017",
          "note": "12,000 to 15,000 deaths; schools closed; 'for a time, it was compulsory to wear a mask in the street'"
        },
        {
          "title": "Influenza Epidemic of 1919, University of Sydney Faculty of Medicine museum",
          "url": "https://www.sydney.edu.au/medicine/museum/mwmuseum/index.php/Influenza_Epidemic_of_1919",
          "note": "About 6,000 NSW deaths; 40 per cent of Sydney ill; masks worn in classrooms"
        }
      ],
      "uncertainties": [
        "Sources differ on cadet age bands: Kingston Local History and the AWM give junior cadets 12 to 14 and senior 14 to 18; the Wikipedia Australian Army Cadets page gives 14 to 16 and 16 to 18.",
        "Wikipedia pages disagree on the opening date of 2SB: 13 November 1923 (ABC Radio Sydney) versus 23 November 1923 (Radio in Australia). The panel says November 1923.",
        "Neither opened source says which state made masks compulsory; The Conversation says only that 'for a time' masks were compulsory in the street, and the University of Sydney page mentions masks in classrooms. The panel no longer names NSW.",
        "The figure of about 54,000 pairs of socks knitted by NSW schoolchildren in 1915 appeared in a search summary of a NSW State Archives page that could not be opened, so it is left out.",
        "NSW car registrations (10,734 by 1915) appeared only in a search snippet; the panel states only that plates began in 1910.",
        "Houdini's flight is described on Wikipedia as what Diggers Rest 'is referred to as' famous for; some sources credit earlier Australian flights."
      ]
    }
  ],
  "curriculum": {
    "links": [
      {
        "yearLevel": "Year 2",
        "learningArea": "HASS F-6 (History)",
        "description": "how technological developments changed people’s lives at home, and in the ways they worked, travelled and communicated",
        "code": "AC9HS2K02",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/hass-f-6/year-2",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "Board, pencil and puzzle games are everyday home technology; comparing a 1880s parlour game with the same game on a screen shows change at home."
      },
      {
        "yearLevel": "Year 2",
        "learningArea": "HASS F-6 (Skills)",
        "description": "interpret information and data from observations and provided sources, including the comparison of objects from the past and present",
        "code": "AC9HS2S03",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/hass-f-6/year-2",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "The site pairs each playable game with a Then panel about who played it, which gives a ready-made past and present comparison."
      },
      {
        "yearLevel": "Year 5",
        "learningArea": "HASS F-6 (History)",
        "description": "the impact of the development of British colonies in Australia on the lives of First Nations Australians, the colonists and convicts, and on the natural environment",
        "code": "AC9HS5K02",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/hass-f-6/year-5",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "The Fifteen Puzzle (1880 craze), Reversi (1883 claims, 1886 first reliable mention) and Snakes and Ladders (registered in England 1892) all date from the colonial period and show what colonists did for leisure."
      },
      {
        "yearLevel": "Year 5",
        "learningArea": "HASS F-6 (Skills)",
        "description": "evaluate primary and secondary sources to determine origin, purpose and perspectives",
        "code": "AC9HS5S04",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/hass-f-6/year-5",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "Students can treat each Then panel, and any newspaper extract it cites, as a source and ask who made it and why."
      },
      {
        "yearLevel": "Year 6",
        "learningArea": "HASS F-6 (History)",
        "description": "changes in Australia's political system and to Australian citizenship after Federation and throughout the 20th century that impacted First Nations Australians, migrants, women and children",
        "code": "AC9HS6K02",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/hass-f-6/year-6",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "The 1913 Word-Cross and the 1920s crossword craze sit inside the post-Federation decades studied in Year 6, and show how children and adults spent leisure time then."
      },
      {
        "yearLevel": "Year 6",
        "learningArea": "HASS F-6 (Skills)",
        "description": "locate, collect and organise information and data from primary and secondary sources in a range of formats",
        "code": "AC9HS6S02",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/hass-f-6/year-6",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "The site's dated games and Then panels can be sorted onto a class timeline alongside Federation-era events."
      },
      {
        "yearLevel": "Year 7",
        "learningArea": "History 7-10 (Skills)",
        "description": "identify the origin, content, context and purpose of primary and secondary sources",
        "code": "AC9HH7S03",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/history-7-10/year-7",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "A Then panel is a secondary source; the newspaper or book it draws on is a primary source, and students can label each."
      },
      {
        "yearLevel": "Year 7",
        "learningArea": "History 7-10 (Skills)",
        "description": "identify and describe the accuracy and usefulness of primary and secondary sources as evidence",
        "code": "AC9HH7S04",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/history-7-10/year-7",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "Sam Loyd's false claim from 1891 to have invented the Fifteen Puzzle is a clean example of a source that is not accurate."
      },
      {
        "yearLevel": "Year 9",
        "learningArea": "History 7-10 (Knowledge)",
        "description": "continuities and changes and their effects on ways of life and living conditions, political and legal institutions, and cultural expression around the turn of the 20th century in Australian society",
        "code": "AC9HH9K05",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/history-7-10/year-9",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "Games played around 1890 to 1920 are cultural expression; the same rules played today show continuity while the medium shows change."
      },
      {
        "yearLevel": "Year 5",
        "learningArea": "Mathematics (Probability)",
        "description": "list the possible outcomes of chance experiments involving equally likely outcomes and compare to those which are not equally likely",
        "code": "AC9M5P01",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/mathematics/year-5",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "A Snakes and Ladders die has six equally likely outcomes; landing on a snake is not equally likely, and the site lets students test both."
      },
      {
        "yearLevel": "Year 5",
        "learningArea": "Mathematics (Probability)",
        "description": "conduct repeated chance experiments including those with and without equally likely outcomes, observe and record the results; use frequency to compare outcomes and estimate their likelihoods",
        "code": "AC9M5P02",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/mathematics/year-5",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "Replaying Snakes and Ladders many times and tallying game length is a repeated chance experiment with no setup."
      },
      {
        "yearLevel": "Year 6",
        "learningArea": "Mathematics (Probability)",
        "description": "conduct repeated chance experiments and run simulations with an increasing number of trials using digital tools; compare observations with expected results and discuss the effect on variation of increasing the number of trials",
        "code": "AC9M6P02",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/mathematics/year-6",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "The digitised Snakes and Ladders is a digital tool for simulation; pooled class results show variation shrinking as trials increase."
      },
      {
        "yearLevel": "Year 7",
        "learningArea": "Mathematics (Probability)",
        "description": "conduct repeated chance experiments and run simulations with a large number of trials using digital tools; compare predictions about outcomes with observed results, explaining the differences",
        "code": "AC9M7P02",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/mathematics/year-7",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "Students can predict whether the first player has an advantage in Snakes and Ladders, then test it across the class."
      },
      {
        "yearLevel": "Years 3 and 4",
        "learningArea": "Digital Technologies",
        "description": "follow and describe algorithms involving sequencing, comparison operators (branching) and iteration",
        "code": "AC9TDI4P02",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/digital-technologies/years-3-and-4",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "Writing out the rules of Noughts and Crosses or Hangman as steps with if and repeat is describing an algorithm."
      },
      {
        "yearLevel": "Years 5 and 6",
        "learningArea": "Digital Technologies",
        "description": "design algorithms involving multiple alternatives (branching) and iteration",
        "code": "AC9TDI6P02",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/digital-technologies/years-5-and-6",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "Students can design the computer opponent's decision rules for Reversi or Hangman and compare them with what the site's opponent actually does."
      },
      {
        "yearLevel": "Years 7 and 8",
        "learningArea": "Digital Technologies",
        "description": "explain how and why digital systems represent integers in binary",
        "code": "AC9TDI8K04",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/digital-technologies/years-7-and-8",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "Nim's winning strategy is the binary digital sum of the heap sizes, so playing Nim is a reason to convert numbers to binary."
      },
      {
        "yearLevel": "Years 7 and 8",
        "learningArea": "Digital Technologies",
        "description": "design algorithms involving nested control structures and represent them using flowcharts and pseudocode",
        "code": "AC9TDI8P05",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/digital-technologies/years-7-and-8",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "A minimax opponent for Noughts and Crosses or a greedy Reversi opponent can be written as a flowchart or pseudocode in one lesson."
      },
      {
        "yearLevel": "Years 7 and 8",
        "learningArea": "Digital Technologies",
        "description": "trace algorithms to predict output for a given input and to identify errors",
        "code": "AC9TDI8P06",
        "url": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/digital-technologies/years-7-and-8",
        "jurisdiction": "Australian Curriculum v9",
        "relevance": "Students can trace the Fifteen Puzzle parity check or the Nim XOR rule by hand and predict what the computer will do next."
      },
      {
        "yearLevel": "Stage 1 (Years 1 and 2)",
        "learningArea": "Human Society and its Environment K-6 (2024), History",
        "description": "describes the ancient past and changes in communication over time, using stories, images, objects and sites as evidence",
        "code": "HS1-HIS-01",
        "url": "https://curriculum.nsw.edu.au/learning-areas/hsie/hsie-k-6-2024/content/stage-1",
        "jurisdiction": "NSW",
        "relevance": "The Stage 1 focus area on this page is 'People learn about the past by engaging with stories, images, objects and sites'; a game board is an object from the past."
      },
      {
        "yearLevel": "Stage 3 (Years 5 and 6)",
        "learningArea": "Human Society and its Environment K-6 (2024), History",
        "description": "examines and describes the development of Australian colonies and Australia as a nation, using sources as evidence",
        "code": "HS3-HIS-01",
        "url": "https://curriculum.nsw.edu.au/learning-areas/hsie/hsie-k-6-2024/content/stage-3",
        "jurisdiction": "NSW",
        "relevance": "Covers both the colonial and the Federation eras that the site's 1880 to 1920 games belong to, and names sources as evidence."
      },
      {
        "yearLevel": "Stage 3 (Years 5 and 6)",
        "learningArea": "Human Society and its Environment K-6 (2024), History focus area",
        "description": "Historical sources present perspectives on the past",
        "code": "",
        "url": "https://curriculum.nsw.edu.au/learning-areas/hsie/hsie-k-6-2024/content/stage-3",
        "jurisdiction": "NSW",
        "relevance": "Then panels and the newspaper items they rest on present a perspective; students can ask whose."
      },
      {
        "yearLevel": "Stage 3 (Years 5 and 6)",
        "learningArea": "Science and Technology K-6 (2024), Digital technologies",
        "description": "creates, evaluates and modifies algorithms to code or control digital devices and systems",
        "code": "ST3-DDT-02",
        "url": "https://curriculum.nsw.edu.au/learning-areas/science/science-and-technology-k-6-2024/content/stage-3",
        "jurisdiction": "NSW",
        "relevance": "Students can write and then improve a rule set for the Hangman or Reversi opponent after watching how the site's opponent plays."
      },
      {
        "yearLevel": "Stage 4 and 5 (Years 7 to 10)",
        "learningArea": "Computing Technology 7-10 (2022)",
        "description": "designs, produces and evaluates algorithms and implements them in a general-purpose and/or object-oriented programming language",
        "code": "CT5-OPL-01",
        "url": "https://curriculum.nsw.edu.au/learning-areas/tas/computing-technology-7-10-2022/content/stage-4",
        "jurisdiction": "NSW",
        "relevance": "Nim's XOR rule and Noughts and Crosses minimax are small enough to code in a lesson; the same page lists the focus area 'Software development: Creating games and simulations'."
      },
      {
        "yearLevel": "Stage 4 and 5 (Years 7 to 10)",
        "learningArea": "History 7-10 (2024) focus area",
        "description": "Australia: Making a nation – from Federation to WWI (1889 – c. 1919)",
        "code": "",
        "url": "https://curriculum.nsw.edu.au/learning-areas/hsie/history-7-10-2024/content/stage-4",
        "jurisdiction": "NSW",
        "relevance": "Snakes and Ladders (1892), Dots and Boxes (first published by Lucas in the 19th century) and the 1913 Word-Cross fall inside this date range."
      }
    ],
    "lessons": [
      {
        "gameId": "noughts-and-crosses",
        "title": "Can you ever beat the computer at Noughts and Crosses?",
        "yearLevels": "Years 4 to 8",
        "idea": "Pairs play five games against the computer and record every result. Ask the class why nobody won, then have each pair write the computer's rule for its first move and for blocking as a short list of if-then steps. Finish by reading the Then panel: the name 'noughts and crosses' first appeared in print in 1858 in Notes and Queries, and in 1952 the EDSAC program OXO became one of the first known video games.",
        "computerAngle": "Noughts and Crosses is a solved game: with best play from both sides the result is always a draw. The computer uses minimax, a rule for minimising the possible loss in the worst case, by looking down the game tree at every reply until the end of the game. The tree is small enough (138 terminal positions, 26,830 games up to rotations and reflections) that a computer can check all of it.",
        "curriculumUrl": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/digital-technologies/years-7-and-8"
      },
      {
        "gameId": "fifteen-puzzle",
        "title": "The puzzle that cannot be solved",
        "yearLevels": "Years 6 to 9",
        "idea": "Give half the class a solvable scramble and half the famous '14-15' swap, and let them try for ten minutes without saying which is which. Reveal that in 1879 Johnson and Story proved half of all starting positions are impossible, no matter how many moves are made. Then read the Then panel together: Noyes Chapman of Canastota, New York showed a precursor as early as 1874, the craze hit the United States in 1880, and from 1891 Sam Loyd falsely claimed to be the inventor. Ask what kind of source would settle who invented it.",
        "computerAngle": "Every arrangement has a parity: count the pairs of tiles that are out of order (inversions), add the row of the empty square, and if the total is even the position can be reached from solved, otherwise it never can. Because each slide changes the count in a fixed way, the arrangements split into two equal halves, and only one half is reachable. The puzzle checks this before it lets a scramble start.",
        "curriculumUrl": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/history-7-10/year-7"
      },
      {
        "gameId": "reversi",
        "title": "Why the greedy computer loses at Reversi",
        "yearLevels": "Years 5 to 8",
        "idea": "Play one game as a class on the projector, choosing each move by a show of hands, and note that the computer always takes the move that flips the most discs. Then let pairs play with one rule only: take a corner whenever you can and avoid the squares next to corners. Compare win rates on the board. Close with the Then panel: two Englishmen, Lewis Waterman and John W. Mollett, each claimed to have invented Reversi in 1883 and called the other a fraud; the first reliable mention is in The Saturday Review of 21 August 1886.",
        "computerAngle": "The opponent uses a greedy heuristic: it scores only the discs it would flip right now and never looks ahead. Strong players instead value mobility (the number of moves available), corners that can never be flipped back, and avoiding the squares next to corners. A player who follows those positional rules beats a disc-counting opponent, which is why the site's computer is beatable. In 1997 the program Logistello, which looked ahead and used positional evaluation, won every game of a six-game match against world champion Takeshi Murakami.",
        "curriculumUrl": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/digital-technologies/years-5-and-6"
      },
      {
        "gameId": "dots-and-boxes",
        "title": "Count the chains before you draw the line",
        "yearLevels": "Years 4 to 8",
        "idea": "Pairs play on a small grid on paper first, then against the computer on the site. Stop the game when every remaining box is part of a chain and ask: who has to open the first chain? Have students count the chains and predict the winner before playing on. The Then panel tells them the game was first published by the French mathematician Édouard Lucas, who called it la pipopipette.",
        "computerAngle": "Late in the game the board breaks into chains, groups of adjacent boxes where any move hands the whole chain to the other player. The player forced to open a chain usually loses, so the real contest is about who runs out of safe moves first. The computer looks ahead to count chains and can use the double-cross, taking all but two boxes in a chain so the opponent must open the next one; Elwyn Berlekamp analysed this in his 2000 book The Dots-and-Boxes Game.",
        "curriculumUrl": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/digital-technologies/years-5-and-6"
      },
      {
        "gameId": "snakes-and-ladders",
        "title": "A game with no decisions",
        "yearLevels": "Years 4 to 7",
        "idea": "Every pair plays three games and records the number of turns in each and which player won. Pool the class results on the board and compare with a prediction students made first. Ask what skill a champion Snakes and Ladders player would need, and take the answer 'none' seriously: the game offers no choices at all. Read the Then panel: the game came from India as Moksha Patam, where ladders were virtues and snakes were vices, and the first English version was registered by F. H. Ayres in October 1892.",
        "computerAngle": "Because a player never chooses anything, the computer is not an opponent at all, just a die. The whole game can be written as an absorbing Markov chain, where each square has a fixed chance of moving to each other square, so the expected length of a game can be calculated exactly. Class tallies will scatter around that expected value, and the scatter gets smaller as more games are pooled, which is the point of repeated chance experiments.",
        "curriculumUrl": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/mathematics/year-5"
      },
      {
        "gameId": "hangman",
        "title": "Which letters should you guess first?",
        "yearLevels": "Years 3 to 7",
        "idea": "Before anyone plays, ask each student to write the six letters they would guess first and why. Play three rounds against the computer and tally which guesses hit. Show the English letter frequency order e-t-a-o-i-n-s-h-r-d-l-u and let students revise their list, then try a word like 'rhythm' to see the strategy fail. Read the Then panel: a scoring variant called Birds, Beasts and Fishes appears in Alice Gomme's 1894 collection of children's games, and the version with the hanged man was described in a 1902 newspaper.",
        "computerAngle": "When the computer guesses, it does not know words, it knows letter frequency: it tries the most common letters first and narrows down as positions are revealed. When it sets the word, it can pick words that avoid common letters. Students can describe its guessing rule as an algorithm with a loop (guess the next most frequent unused letter) and a branch (if the letter is in the word, fill it in).",
        "curriculumUrl": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/digital-technologies/years-3-and-4"
      },
      {
        "gameId": "nim",
        "title": "Beat the computer at Nim with binary",
        "yearLevels": "Years 7 to 9",
        "idea": "Let pairs play Nim against the computer and lose a few times. Then teach the trick: write each heap size in binary, add the columns without carrying, and move so that every column sums to an even number. Pairs test the rule and should start winning whenever they get a position with an odd column. The Then panel explains that Charles L. Bouton of Harvard named the game and published its complete theory in 1901, that Westinghouse showed a Nim-playing machine, the Nimatron, at the New York World's Fair, and that Ferranti displayed a Nim-playing computer at the Festival of Britain in 1951.",
        "computerAngle": "The computer wins with the nim-sum, the binary digital sum of the heap sizes with all carries ignored, which is the same as bitwise XOR. If the nim-sum is zero the player to move is losing; otherwise there is always a move that makes it zero. This is a direct, playable reason to represent integers in binary, and a student who has done the XOR by hand can trace the computer's next move exactly.",
        "curriculumUrl": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/digital-technologies/years-7-and-8"
      },
      {
        "gameId": "word-cross-1913",
        "title": "Solve the first crossword",
        "yearLevels": "Years 5 to 9",
        "idea": "Project the 1913 Word-Cross and solve it as a class, one clue at a time, noting that every clue is a plain definition. Ask which answers are hard because the language or the facts have changed since 1913, and list them as evidence about the period. Then have pairs write three definition clues and one cryptic clue for words from their own week. The Then panel gives the date: Arthur Wynne published the puzzle in the New York World on 21 December 1913, an illustrator later reversed the name to 'cross-word', and the first book of crosswords came from Simon and Schuster in 1924.",
        "computerAngle": "A crossword is a constraint puzzle: each clue is a definition, and the crossing letters, called checks, confirm or rule out an answer when several synonyms fit. Straight clues give a definition only; cryptic clues, which came later, give a definition plus wordplay. The site checks each letter against the grid the way a solver uses checks, so students can see why filling the crossings first makes the hard clues easier.",
        "curriculumUrl": "https://www.australiancurriculum.edu.au/f-10-curriculum/learning-areas/hass-f-6/year-6"
      }
    ],
    "tips": [
      "Project one game on the classroom screen and let the class vote on each move by a show of hands; this works best for Reversi, Dots and Boxes and the Word-Cross, where the discussion about the next move is the lesson.",
      "Put pairs on one device and give each partner a job: one plays, one records results or writes the computer's rule as steps. Swap roles each game so both get a turn.",
      "No accounts, logins or email addresses are needed, so there is nothing to set up and no student data is collected; students simply open the page and play.",
      "Download a copy of the site before the lesson if the school network is unreliable; the games run from the downloaded copy without an internet connection.",
      "Print the boards for Noughts and Crosses, Dots and Boxes, Nim (use counters) and Snakes and Ladders so students can play on paper first, then compare with the screen version and talk about what the computer changes.",
      "Use the Then panels as a source-analysis task: ask who made the original source the panel relies on, when, for what purpose, and whether the panel is a primary or secondary source. Sam Loyd's false claim to the Fifteen Puzzle is a ready example of a source that is wrong."
    ]
  },
  "trove": [],
  "wordCross": {
    "title": "FUN'S Word-Cross Puzzle",
    "author": "Arthur Wynne",
    "publication": "New York World (Sunday comic section \"Fun\")",
    "date": "1913-12-21",
    "grid": [
      "######R######",
      "#####FUN#####",
      "####SALES####",
      "###RECEIPT###",
      "##MERE#FARM##",
      "#DOVE###RAIL#",
      "MORE#####DRAW",
      "#HARD###TIED#",
      "##LION#SAND##",
      "###EVENING###",
      "####EVADE####",
      "#####ARE#####",
      "######D######"
    ],
    "labels": [
      {
        "row": 0,
        "col": 6,
        "label": "1"
      },
      {
        "row": 1,
        "col": 5,
        "label": "F"
      },
      {
        "row": 1,
        "col": 6,
        "label": "U"
      },
      {
        "row": 1,
        "col": 7,
        "label": "N"
      },
      {
        "row": 2,
        "col": 4,
        "label": "2"
      },
      {
        "row": 2,
        "col": 8,
        "label": "3"
      },
      {
        "row": 3,
        "col": 3,
        "label": "4"
      },
      {
        "row": 3,
        "col": 6,
        "label": "32"
      },
      {
        "row": 3,
        "col": 9,
        "label": "5"
      },
      {
        "row": 4,
        "col": 2,
        "label": "6"
      },
      {
        "row": 4,
        "col": 5,
        "label": "7"
      },
      {
        "row": 4,
        "col": 7,
        "label": "8"
      },
      {
        "row": 4,
        "col": 10,
        "label": "9"
      },
      {
        "row": 5,
        "col": 1,
        "label": "10"
      },
      {
        "row": 5,
        "col": 4,
        "label": "11"
      },
      {
        "row": 5,
        "col": 8,
        "label": "12"
      },
      {
        "row": 5,
        "col": 11,
        "label": "13"
      },
      {
        "row": 6,
        "col": 0,
        "label": "14"
      },
      {
        "row": 6,
        "col": 3,
        "label": "15"
      },
      {
        "row": 6,
        "col": 9,
        "label": "16"
      },
      {
        "row": 6,
        "col": 12,
        "label": "17"
      },
      {
        "row": 7,
        "col": 1,
        "label": "18"
      },
      {
        "row": 7,
        "col": 4,
        "label": "19"
      },
      {
        "row": 7,
        "col": 8,
        "label": "20"
      },
      {
        "row": 7,
        "col": 11,
        "label": "21"
      },
      {
        "row": 8,
        "col": 2,
        "label": "22"
      },
      {
        "row": 8,
        "col": 5,
        "label": "23"
      },
      {
        "row": 8,
        "col": 7,
        "label": "24"
      },
      {
        "row": 8,
        "col": 10,
        "label": "25"
      },
      {
        "row": 9,
        "col": 3,
        "label": "26"
      },
      {
        "row": 9,
        "col": 6,
        "label": "33"
      },
      {
        "row": 9,
        "col": 9,
        "label": "27"
      },
      {
        "row": 10,
        "col": 4,
        "label": "28"
      },
      {
        "row": 10,
        "col": 8,
        "label": "29"
      },
      {
        "row": 11,
        "col": 5,
        "label": "30"
      },
      {
        "row": 11,
        "col": 7,
        "label": "31"
      },
      {
        "row": 12,
        "col": 6,
        "label": "34"
      }
    ],
    "clues": [
      {
        "label": "FUN",
        "clue": "Pre-printed in the original; no clue was given.",
        "answer": "FUN",
        "cells": [
          [
            1,
            5
          ],
          [
            1,
            6
          ],
          [
            1,
            7
          ]
        ],
        "prefilled": true
      },
      {
        "label": "2-3",
        "clue": "What bargain hunters enjoy.",
        "answer": "SALES",
        "cells": [
          [
            2,
            4
          ],
          [
            2,
            5
          ],
          [
            2,
            6
          ],
          [
            2,
            7
          ],
          [
            2,
            8
          ]
        ],
        "prefilled": false
      },
      {
        "label": "4-5",
        "clue": "A written acknowledgment.",
        "answer": "RECEIPT",
        "cells": [
          [
            3,
            3
          ],
          [
            3,
            4
          ],
          [
            3,
            5
          ],
          [
            3,
            6
          ],
          [
            3,
            7
          ],
          [
            3,
            8
          ],
          [
            3,
            9
          ]
        ],
        "prefilled": false
      },
      {
        "label": "6-7",
        "clue": "Such and nothing more.",
        "answer": "MERE",
        "cells": [
          [
            4,
            2
          ],
          [
            4,
            3
          ],
          [
            4,
            4
          ],
          [
            4,
            5
          ]
        ],
        "prefilled": false
      },
      {
        "label": "10-11",
        "clue": "A bird.",
        "answer": "DOVE",
        "cells": [
          [
            5,
            1
          ],
          [
            5,
            2
          ],
          [
            5,
            3
          ],
          [
            5,
            4
          ]
        ],
        "prefilled": false
      },
      {
        "label": "14-15",
        "clue": "Opposed to less.",
        "answer": "MORE",
        "cells": [
          [
            6,
            0
          ],
          [
            6,
            1
          ],
          [
            6,
            2
          ],
          [
            6,
            3
          ]
        ],
        "prefilled": false
      },
      {
        "label": "18-19",
        "clue": "What this puzzle is.",
        "answer": "HARD",
        "cells": [
          [
            7,
            1
          ],
          [
            7,
            2
          ],
          [
            7,
            3
          ],
          [
            7,
            4
          ]
        ],
        "prefilled": false
      },
      {
        "label": "22-23",
        "clue": "An animal of prey.",
        "answer": "LION",
        "cells": [
          [
            8,
            2
          ],
          [
            8,
            3
          ],
          [
            8,
            4
          ],
          [
            8,
            5
          ]
        ],
        "prefilled": false
      },
      {
        "label": "26-27",
        "clue": "The close of a day.",
        "answer": "EVENING",
        "cells": [
          [
            9,
            3
          ],
          [
            9,
            4
          ],
          [
            9,
            5
          ],
          [
            9,
            6
          ],
          [
            9,
            7
          ],
          [
            9,
            8
          ],
          [
            9,
            9
          ]
        ],
        "prefilled": false
      },
      {
        "label": "28-29",
        "clue": "To elude.",
        "answer": "EVADE",
        "cells": [
          [
            10,
            4
          ],
          [
            10,
            5
          ],
          [
            10,
            6
          ],
          [
            10,
            7
          ],
          [
            10,
            8
          ]
        ],
        "prefilled": false
      },
      {
        "label": "30-31",
        "clue": "The plural of is.",
        "answer": "ARE",
        "cells": [
          [
            11,
            5
          ],
          [
            11,
            6
          ],
          [
            11,
            7
          ]
        ],
        "prefilled": false
      },
      {
        "label": "8-9",
        "clue": "To cultivate.",
        "answer": "FARM",
        "cells": [
          [
            4,
            7
          ],
          [
            4,
            8
          ],
          [
            4,
            9
          ],
          [
            4,
            10
          ]
        ],
        "prefilled": false
      },
      {
        "label": "12-13",
        "clue": "A bar of wood or iron.",
        "answer": "RAIL",
        "cells": [
          [
            5,
            8
          ],
          [
            5,
            9
          ],
          [
            5,
            10
          ],
          [
            5,
            11
          ]
        ],
        "prefilled": false
      },
      {
        "label": "16-17",
        "clue": "What artists learn to do.",
        "answer": "DRAW",
        "cells": [
          [
            6,
            9
          ],
          [
            6,
            10
          ],
          [
            6,
            11
          ],
          [
            6,
            12
          ]
        ],
        "prefilled": false
      },
      {
        "label": "20-21",
        "clue": "Fastened.",
        "answer": "TIED",
        "cells": [
          [
            7,
            8
          ],
          [
            7,
            9
          ],
          [
            7,
            10
          ],
          [
            7,
            11
          ]
        ],
        "prefilled": false
      },
      {
        "label": "24-25",
        "clue": "Found on the seashore.",
        "answer": "SAND",
        "cells": [
          [
            8,
            7
          ],
          [
            8,
            8
          ],
          [
            8,
            9
          ],
          [
            8,
            10
          ]
        ],
        "prefilled": false
      },
      {
        "label": "10-18",
        "clue": "The fibre of the gomuti palm.",
        "answer": "DOH",
        "cells": [
          [
            5,
            1
          ],
          [
            6,
            1
          ],
          [
            7,
            1
          ]
        ],
        "prefilled": false
      },
      {
        "label": "6-22",
        "clue": "What we all should be.",
        "answer": "MORAL",
        "cells": [
          [
            4,
            2
          ],
          [
            5,
            2
          ],
          [
            6,
            2
          ],
          [
            7,
            2
          ],
          [
            8,
            2
          ]
        ],
        "prefilled": false
      },
      {
        "label": "4-26",
        "clue": "A day dream.",
        "answer": "REVERIE",
        "cells": [
          [
            3,
            3
          ],
          [
            4,
            3
          ],
          [
            5,
            3
          ],
          [
            6,
            3
          ],
          [
            7,
            3
          ],
          [
            8,
            3
          ],
          [
            9,
            3
          ]
        ],
        "prefilled": false
      },
      {
        "label": "2-11",
        "clue": "A talon.",
        "answer": "SERE",
        "cells": [
          [
            2,
            4
          ],
          [
            3,
            4
          ],
          [
            4,
            4
          ],
          [
            5,
            4
          ]
        ],
        "prefilled": false
      },
      {
        "label": "19-28",
        "clue": "A pigeon.",
        "answer": "DOVE",
        "cells": [
          [
            7,
            4
          ],
          [
            8,
            4
          ],
          [
            9,
            4
          ],
          [
            10,
            4
          ]
        ],
        "prefilled": false
      },
      {
        "label": "F-7",
        "clue": "Part of your head.",
        "answer": "FACE",
        "cells": [
          [
            1,
            5
          ],
          [
            2,
            5
          ],
          [
            3,
            5
          ],
          [
            4,
            5
          ]
        ],
        "prefilled": false
      },
      {
        "label": "23-30",
        "clue": "A river in Russia.",
        "answer": "NEVA",
        "cells": [
          [
            8,
            5
          ],
          [
            9,
            5
          ],
          [
            10,
            5
          ],
          [
            11,
            5
          ]
        ],
        "prefilled": false
      },
      {
        "label": "1-32",
        "clue": "To govern.",
        "answer": "RULE",
        "cells": [
          [
            0,
            6
          ],
          [
            1,
            6
          ],
          [
            2,
            6
          ],
          [
            3,
            6
          ]
        ],
        "prefilled": false
      },
      {
        "label": "33-34",
        "clue": "An aromatic plant.",
        "answer": "NARD",
        "cells": [
          [
            9,
            6
          ],
          [
            10,
            6
          ],
          [
            11,
            6
          ],
          [
            12,
            6
          ]
        ],
        "prefilled": false
      },
      {
        "label": "N-8",
        "clue": "A fist.",
        "answer": "NEIF",
        "cells": [
          [
            1,
            7
          ],
          [
            2,
            7
          ],
          [
            3,
            7
          ],
          [
            4,
            7
          ]
        ],
        "prefilled": false
      },
      {
        "label": "24-31",
        "clue": "To agree with.",
        "answer": "SIDE",
        "cells": [
          [
            8,
            7
          ],
          [
            9,
            7
          ],
          [
            10,
            7
          ],
          [
            11,
            7
          ]
        ],
        "prefilled": false
      },
      {
        "label": "3-12",
        "clue": "Part of a ship.",
        "answer": "SPAR",
        "cells": [
          [
            2,
            8
          ],
          [
            3,
            8
          ],
          [
            4,
            8
          ],
          [
            5,
            8
          ]
        ],
        "prefilled": false
      },
      {
        "label": "20-29",
        "clue": "One.",
        "answer": "TANE",
        "cells": [
          [
            7,
            8
          ],
          [
            8,
            8
          ],
          [
            9,
            8
          ],
          [
            10,
            8
          ]
        ],
        "prefilled": false
      },
      {
        "label": "5-27",
        "clue": "Exchanging.",
        "answer": "TRADING",
        "cells": [
          [
            3,
            9
          ],
          [
            4,
            9
          ],
          [
            5,
            9
          ],
          [
            6,
            9
          ],
          [
            7,
            9
          ],
          [
            8,
            9
          ],
          [
            9,
            9
          ]
        ],
        "prefilled": false
      },
      {
        "label": "9-25",
        "clue": "To sink in mud.",
        "answer": "MIRED",
        "cells": [
          [
            4,
            10
          ],
          [
            5,
            10
          ],
          [
            6,
            10
          ],
          [
            7,
            10
          ],
          [
            8,
            10
          ]
        ],
        "prefilled": false
      },
      {
        "label": "13-21",
        "clue": "A boy.",
        "answer": "LAD",
        "cells": [
          [
            5,
            11
          ],
          [
            6,
            11
          ],
          [
            7,
            11
          ]
        ],
        "prefilled": false
      }
    ],
    "sources": [
      {
        "title": "American Crossword Puzzle Tournament: The world's first crossword puzzle (clues)",
        "url": "https://www.crosswordtournament.com/more/wynne.html",
        "note": "Full clue list with labels; date 21 December 1913, New York World; describes the diamond shape. Reads 'A written acknowledgment.' and 'To sink in mud.' Re-opened for this verification: all 31 clue texts and labels match."
      },
      {
        "title": "American Crossword Puzzle Tournament: Solution to the First Crossword Puzzle",
        "url": "https://www.crosswordtournament.com/more/wynne2.html",
        "note": "Letter-by-letter solution diamond (R / FUN / SALES / RECEIPT / MERE FARM / DOVE RAIL / MORE DRAW / HARD TIED / LION SAND / EVENING / EVADE / ARE / D). Re-opened: letters match the grid."
      },
      {
        "title": "Puzzazz: The first crossword, in ipuz format, by Arthur Wynne, December 21, 1913",
        "url": "https://www.puzzazz.com/ipuz/example/first",
        "note": "Independent structured 13x13 grid with label positions, full solution letters and every clue's cell coordinates (ipuz lists cells as [col,row]); title 'FUN's Word-Cross Puzzle' and the instruction 'Fill in the small squares with words which agree with the following definitions.' Raw JSON downloaded and compared programmatically: grid, all 37 labels, all 31 clue texts, answers and cell lists match the data here exactly."
      },
      {
        "title": "Wikimedia Commons: File:First_crossword.png (recreation of the 21 December 1913 puzzle)",
        "url": "https://commons.wikimedia.org/wiki/File:First_crossword.png",
        "note": "Recreation image used for the printed layout, label placement and two-column clue order. Its description says it differs from the original only in typeface and in 'spelling fixes in labels 4-5 and 9-25'. Public domain (author died 1945, published before 1931)."
      },
      {
        "title": "Best for Puzzles: The World's First Crossword",
        "url": "https://bestforpuzzles.com/bits/first-crossword.html",
        "note": "Independent clue transcription in two columns; places 10-18 after 24-25 and before 6-22, agreeing with the column order used here. Reads 'A written acknowledgment.' and 'To sink in mud.' Has a typo '23.30' for 23-30. Confirms the instruction sentence, that Fun was the eight-page comic section of the New York World, and that Wynne wrote FUN across the top squares."
      },
      {
        "title": "Reader's Digest: Try to Solve the First Crossword Ever Published",
        "url": "https://www.rd.com/article/solve-first-crossword-puzzle/",
        "note": "Secondary clue listing in the same interleaved order as ACPT; agrees with ACPT wording for all 31 clues; states the diamond shape with an open space in the middle, start-and-end numbering, and that FUN was pre-filled as the name of the newspaper section."
      },
      {
        "title": "Wikipedia: Arthur Wynne",
        "url": "https://en.wikipedia.org/wiki/Arthur_Wynne",
        "note": "Date 21 December 1913, 'Fun' section of the Sunday New York World, diamond shape with hollow centre, F-U-N pre-filled, called a 'Word-Cross Puzzle'; cites Augarde, The Oxford Guide to Word Games (2003)."
      },
      {
        "title": "Wikipedia: Crossword",
        "url": "https://en.wikipedia.org/wiki/Crossword",
        "note": "Wynne, born in Liverpool, published the 'word-cross' in the New York World on 21 December 1913; an illustrator later reversed the name to 'cross-word'."
      },
      {
        "title": "Literary Hub: Can you solve the very first published crossword puzzle?",
        "url": "https://lithub.com/can-you-solve-the-very-first-published-crossword-puzzle/",
        "note": "Source not cited by the draft, opened for this verification. Confirms the New York World, 21 December 1913, Arthur Wynne, and the title 'FUN's Word-Cross Puzzle' later becoming 'Cross-Word' through a typographical error. Reproduces the puzzle as an image only, so it was not used for clue wording."
      }
    ],
    "discrepancies": [
      "Verified unchanged. A Python check (run with Bash) printed the 13x13 grid with row and column indices and confirmed: the letter cells form a diamond whose outline is symmetric about the centre; the 13 empty cells inside the outline ((4,6), (5,5)-(5,7), (6,4)-(6,8), (7,5)-(7,7), (8,6)) form the hollow centre; no letters lie outside the diamond; FUN sits in row 1, columns 5-7, with the 'F', 'U', 'N' labels on those cells.",
      "Verified unchanged: all 32 entries (31 clues plus the FUN pre-print) read the stated answer along the listed cells; every cell list is a contiguous straight line of the right length; the first and last cells of every clue carry the labels named in the clue label (for example 4-26 starts on the cell labelled 4 and ends on the cell labelled 26); every letter cell is covered by at least one entry; no entry covers a black cell; all 37 labels sit on letter cells and each is used by at least one entry.",
      "Verified unchanged: the raw Puzzazz ipuz JSON was downloaded and compared programmatically. Its solution array equals the grid here cell for cell, its 37 label positions equal the labels here, and after converting ipuz [col,row] to [row,col] all 31 clue texts (ignoring the terminal full stops the ipuz omits), answers and cell lists are identical to the data here. The initial WebFetch summary of that page had invented answers such as FIST, MIRE, TINE, SUIT and DILL; the raw JSON shows NEIF, MIRED, TANE, SIDE and NARD, as in the data here.",
      "Verified unchanged: clue wording and numbering match four independent transcriptions opened for this check (ACPT, Puzzazz ipuz, Best for Puzzles, Reader's Digest). All four read 'A written acknowledgment.' for 4-5 and 'To sink in mud.' for 9-25; the Commons recreation's 'acknowledgement' and 'Sunk in mud' remain explained by its own note that labels 4-5 and 9-25 were spelling-corrected.",
      "Clue order remains as the draft chose it: ACPT and Reader's Digest list the clues in interleaved left/right order with 10-18 last; Best for Puzzles prints 10-18 after 24-25 in the left column; Puzzazz groups them as Across and Down. The column-by-column order used here does not affect play.",
      "Best for Puzzles' '23.30' typo for 23-30 confirmed on re-reading; every other source prints 23-30.",
      "No scan of the Sunday New York World of 21 December 1913 was found online in this check either (Literary Hub reproduces an image but does not say where it came from). Terminal full stops on clues and the exact clue layout therefore still rest on the recreation and the transcriptions, not on a primary scan.",
      "The FUN entry remains a prefilled pseudo-clue; its clue text is an editorial note, not original wording."
    ],
    "confidence": "high"
  }
};
