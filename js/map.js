/**
 * map.js — Interactive UK SVG map
 */
(function() {
  'use strict';

  const COUNTRY_DATA = {
    england: {
      name: 'England', nameRu: 'Англия', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      color: '#CF142B',
      capital: 'London', area: '130,395 km²', population: '56.5 million', language: 'English',
      description: 'England is the largest and most populous country in the UK, home to London — one of the world\'s great global cities. Famous for its history, the monarchy, world-class universities, and cultural heritage.',
      landmarks: [
        { name: 'Buckingham Palace', emoji: '🏰', desc: 'Official London residence of the monarch.' },
        { name: 'Stonehenge', emoji: '🪨', desc: 'Prehistoric stone circle, built around 3000 BC.' },
        { name: 'Big Ben & Parliament', emoji: '🕰️', desc: 'Iconic clock tower in Westminster, London.' },
        { name: 'Tower of London', emoji: '🗼', desc: 'Historic castle on the Thames, once a royal prison.' },
      ],
      link: 'england.html'
    },
    scotland: {
      name: 'Scotland', nameRu: 'Шотландия', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      color: '#003F87',
      capital: 'Edinburgh', area: '77,933 km²', population: '5.5 million', language: 'English, Scottish Gaelic',
      description: 'Scotland occupies the northern third of Great Britain, known for dramatic Highland landscapes, ancient castles, whisky, and rich Celtic heritage.',
      landmarks: [
        { name: 'Edinburgh Castle', emoji: '🏰', desc: 'Fortress above Edinburgh on Castle Rock.' },
        { name: 'Loch Ness', emoji: '🦕', desc: 'Deep Highland loch, home to the legendary Nessie.' },
        { name: 'Ben Nevis', emoji: '⛰️', desc: 'The highest mountain in the UK at 1,345m.' },
        { name: 'Glencoe', emoji: '🏔️', desc: 'Stunning glaciated valley in the Highlands.' },
      ],
      link: 'scotland.html'
    },
    wales: {
      name: 'Wales', nameRu: 'Уэльс', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
      color: '#00712D',
      capital: 'Cardiff', area: '20,779 km²', population: '3.2 million', language: 'English, Welsh',
      description: 'Wales is a land of stunning landscapes, a living Celtic language, powerful choral traditions, and more castles per square mile than any other country.',
      landmarks: [
        { name: 'Cardiff Castle', emoji: '🏰', desc: 'Medieval castle in the heart of the capital.' },
        { name: 'Snowdon (Yr Wyddfa)', emoji: '⛰️', desc: 'The highest mountain in Wales at 1,085m.' },
        { name: 'Caernarfon Castle', emoji: '🏯', desc: '13th-century fortress, UNESCO World Heritage Site.' },
        { name: 'Pembrokeshire Coast', emoji: '🌊', desc: 'The only coastal National Park in the UK.' },
      ],
      link: 'wales.html'
    },
    'northern-ireland': {
      name: 'Northern Ireland', nameRu: 'Северная Ирландия', flag: '🇬🇧',
      color: '#FF6B35',
      capital: 'Belfast', area: '13,843 km²', population: '1.9 million', language: 'English, Irish',
      description: 'The smallest UK nation, situated on the north-east of Ireland. Known for the Giant\'s Causeway, the birthplace of the Titanic, and vibrant cities.',
      landmarks: [
        { name: "Giant's Causeway", emoji: '🪨', desc: '~40,000 basalt columns; UNESCO World Heritage Site.' },
        { name: 'Titanic Belfast', emoji: '🚢', desc: 'World-class museum on the Titanic\'s birthplace.' },
        { name: 'Dark Hedges', emoji: '🌳', desc: 'Stunning beech avenue, featured in Game of Thrones.' },
        { name: 'Carrick-a-Rede Bridge', emoji: '🌉', desc: 'Famous rope bridge on the Antrim coast.' },
      ],
      link: 'northern-ireland.html'
    }
  };

  let activeNation = null;

  function showInfo(nationId) {
    const data = COUNTRY_DATA[nationId];
    if (!data) return;

    activeNation = nationId;

    // Update SVG active state
    document.querySelectorAll('.nation').forEach(n => {
      n.classList.toggle('active', n.dataset.nation === nationId);
    });

    // Update legend active
    document.querySelectorAll('.legend-item').forEach(l => {
      l.classList.toggle('active', l.dataset.nation === nationId);
    });

    // Build info panel
    const placeholder = document.getElementById('infoPlaceholder');
    const content     = document.getElementById('infoContent');

    if (placeholder) placeholder.style.display = 'none';
    if (content) {
      content.className = 'info-content visible';
      content.innerHTML = `
        <div class="info-header" style="background:${data.color}">
          <div class="country-flag">${data.flag}</div>
          <h2>${data.name}</h2>
          <div class="name-ru">${data.nameRu}</div>
        </div>
        <div class="info-body">
          <div class="info-facts">
            <div class="info-fact">
              <div class="label">🏛 Capital</div>
              <div class="value">${data.capital}</div>
            </div>
            <div class="info-fact">
              <div class="label">📐 Area</div>
              <div class="value">${data.area}</div>
            </div>
            <div class="info-fact">
              <div class="label">👥 Population</div>
              <div class="value">${data.population}</div>
            </div>
            <div class="info-fact">
              <div class="label">🗣 Language</div>
              <div class="value">${data.language}</div>
            </div>
          </div>
          <p class="info-description">${data.description}</p>
          <div class="info-landmarks">
            <h4>🗺 Famous Landmarks</h4>
            ${data.landmarks.map(l => `
              <div class="landmark-item">
                <div class="landmark-emoji">${l.emoji}</div>
                <div class="landmark-text">
                  <strong>${l.name}</strong>
                  <span>${l.desc}</span>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="info-cta">
            <a href="${data.link}" class="btn btn-primary btn-sm">
              <i class="fa fa-flag"></i> Подробнее о ${data.name}
            </a>
          </div>
        </div>
      `;
    }
  }

  function initMap() {
    // Nation click handlers
    document.querySelectorAll('.nation').forEach(nation => {
      const id = nation.dataset.nation;
      if (!id) return;

      nation.addEventListener('click', () => showInfo(id));
      nation.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') showInfo(id);
      });

      // Tooltip on hover
      nation.addEventListener('mouseenter', () => {
        const data = COUNTRY_DATA[id];
        if (data) {
          const tip = document.getElementById('mapTooltip');
          if (tip) { tip.textContent = data.name; tip.style.display = 'block'; }
        }
      });
      nation.addEventListener('mouseleave', () => {
        const tip = document.getElementById('mapTooltip');
        if (tip) tip.style.display = 'none';
      });
    });

    // Legend clicks
    document.querySelectorAll('.legend-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.nation;
        if (id) showInfo(id);
      });
    });

    // City marker tooltips
    document.querySelectorAll('.city-marker').forEach(marker => {
      marker.addEventListener('click', () => {
        const city    = marker.dataset.city;
        const country = marker.dataset.country;
        if (city && country) {
          showInfo(country);
          showToast(`${city} — ${COUNTRY_DATA[country]?.name || country}`);
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initMap);

})();
