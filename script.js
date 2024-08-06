$(document).ready(function() {
    const positionColors = {
        'PG': '#FF6384',
        'SG': '#36A2EB',
        'SF': '#FFCE56',
        'PF': '#4BC0C0',
        'C': '#9966FF'
    };

    let nbaTeams = {};
    let currentTeam = null;
    let customPlayers = {};
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    function fetchNBATeams() {
        const cachedData = getCachedData('nbaTeams');
        if (cachedData) {
            nbaTeams = cachedData;
            updateTeamDropdown();
            return;
        }
    
        fetch('nba_teams.json')
            .then(response => response.json())
            .then(data => {
                nbaTeams = data;
                setCachedData('nbaTeams', nbaTeams);
                updateTeamDropdown();
            })
            .catch(error => {
                console.error('Error fetching teams:', error);
                alert('Failed to fetch teams. Please try again later.');
            });
    }

    function getCachedData(key) {
        const cachedData = localStorage.getItem(key);
        if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData);
            if (Date.now() - timestamp < CACHE_DURATION) {
                return data;
            }
        }
        return null;
    }

    function setCachedData(key, data) {
        const cacheData = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
    }

    function updateTeamDropdown() {
        const $teamDropdown = $('#team-dropdown');
        $teamDropdown.empty().append($('<option>', {
            value: "",
            text: "Select a team"
        }));
        Object.keys(nbaTeams).forEach(team => {
            $teamDropdown.append($('<option>', {
                value: team,
                text: team
            }));
        });
        updatePlayerDropdown(null);  // Initially disable the player dropdown
    }

    function updateSummary() {
        const playerSummary = {};
        const positionSummary = {};
        let totalMinutes = 0;

        $('.position').each(function() {
            const $position = $(this);
            const positionName = $position.data('position');
            let positionMinutes = 0;

            $position.find('.slot').each(function() {
                const $slot = $(this);
                const playerName = $slot.find('.player').data('name');
                const minutes = parseInt($slot.data('minutes'), 10) || 0;

                if (playerName) {
                    if (!playerSummary[playerName]) {
                        playerSummary[playerName] = { total: 0, positions: {} };
                    }
                    playerSummary[playerName].total += minutes;
                    playerSummary[playerName].positions[positionName] = (playerSummary[playerName].positions[positionName] || 0) + minutes;
                }
                positionMinutes += minutes;
            });

            positionSummary[positionName] = positionMinutes;

            if (positionMinutes > 48) {
                $position.find('.minutes-warning').text('Total minutes exceed 48!').show();
            } else {
                $position.find('.minutes-warning').hide();
            }

            $position.find('.position-minutes').text(`${positionMinutes}/48`);

            totalMinutes += positionMinutes;
        });

        $('#summary').empty();

        if (Object.keys(playerSummary).length === 0) {
            $('#summary').append('<div class="placeholder">Add a player to a slot to get started!</div>');
        } else {
            $.each(playerSummary, function(player, data) {
                const chartId = `chart-${player.replace(/\s+/g, '-')}`;
                $('#summary').append(`
                    <div class="player-summary">
                        <span>${player}: ${data.total} mins</span>
                        <canvas id="${chartId}" width="150" height="150"></canvas>
                    </div>
                `);
                createChart(chartId, data.positions);
            });

            if (totalMinutes > 240) {
                $('#summary').append('<div class="warning">Total minutes exceed 240!</div>');
            }

            $.each(playerSummary, function(player, data) {
                if (data.total > 48) {
                    $('#summary').append(`<div class="warning">${player} exceeds 48 minutes!</div>`);
                }
            });
        }

        $('#total-minutes').text(`Total Minutes: ${totalMinutes}/240`);

        // Create position legend
        const $legend = $('#position-legend');
        $legend.empty();
        Object.entries(positionColors).forEach(([position, color]) => {
            $legend.append(`
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${color};"></div>
                    <span class="legend-label">${position}</span>
                </div>
            `);
        });

        return { players: playerSummary, positions: positionSummary };
    }

    function createChart(chartId, positionData) {
        const ctx = document.getElementById(chartId).getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(positionData),
                datasets: [{
                    data: Object.values(positionData),
                    backgroundColor: Object.keys(positionData).map(pos => positionColors[pos])
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                layout: {
                    padding: 10
                }
            }
        });
    }

    function calculatePositionTotal($position) {
        return $position.find('.slot').toArray().reduce((acc, slot) => {
            return acc + (parseInt($(slot).data('minutes'), 10) || 0);
        }, 0);
    }

    function createSliderSVG(value, max) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100");
        svg.setAttribute("height", "20");
    
        const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        background.setAttribute("width", "100");
        background.setAttribute("height", "10");
        background.setAttribute("fill", "#ddd");
        background.setAttribute("rx", "5");
        background.setAttribute("ry", "5");
        background.setAttribute("y", "5");
    
        const fill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        fill.setAttribute("width", (value / max * 100).toString());
        fill.setAttribute("height", "10");
        fill.setAttribute("fill", "#4CAF50");
        fill.setAttribute("rx", "5");
        fill.setAttribute("ry", "5");
        fill.setAttribute("y", "5");
    
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", "50");
        text.setAttribute("y", "15");
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "black");
        text.setAttribute("font-size", "12");
        text.textContent = `${value} mins`;
    
        svg.appendChild(background);
        svg.appendChild(fill);
        svg.appendChild(text);
    
        return svg;
    }

    function calculatePlayerTotal(playerName) {
        let total = 0;
        $('.slot').each(function() {
            const $slot = $(this);
            const slotPlayerName = $slot.find('.player').data('name');
            if (slotPlayerName === playerName) {
                total += parseInt($slot.data('minutes'), 10) || 0;
            }
        });
        return total;
    }

    function addSlot(position) {
        const isOnlySlot = position.find('.slot').length === 0;
        const newSlot = $(`
            <div class="slot empty-slot">
                <span>Empty Slot</span>
                ${isOnlySlot ? '' : '<button class="remove-slot">Remove</button>'}
            </div>
        `);
        position.append(newSlot);
    }

    function removeSlot() {
        const $position = $(this).closest('.position');
        $(this).closest('.slot').remove();
        if ($position.find('.slot').length === 0) {
            addSlot($position);
        } else if ($position.find('.slot').length === 1) {
            $position.find('.remove-slot').remove();
        }
        updateSummary();
    }

    $(document).on('click', '.slot', function() {
        const $slot = $(this);
        if ($slot.hasClass('filled-slot')) {
            return; // Do nothing if the slot is already filled
        }
        
        const selectedPlayer = $('#player-dropdown').val();
        if (!selectedPlayer) {
            alert('Please select a player first.');
            return;
        }
        const $position = $slot.closest('.position');

        if ($position.find(`.player[data-name="${selectedPlayer}"]`).length > 0) {
            alert('This player is already in this position.');
            return;
        }

        addPlayerToSlot($slot, selectedPlayer);
    });

    function addPlayerToSlot($slot, playerName) {
        const $position = $slot.closest('.position');
        
        const slider = $('<input type="range" min="0" max="48" value="0">');
        slider.on('input', function() {
            updateSliderValue($slot, $(this), playerName);
        });

        $slot.empty();
        const playerElement = $(`<div class="player" data-name="${playerName}">${playerName}</div>`);
        $slot.append(playerElement);
        $slot.append(slider);
        $slot.append(`<span class="minutes-display">0 mins</span>`);
        $slot.append('<button class="remove-slot">Remove</button>');
        $slot.removeClass('empty-slot').addClass('filled-slot');
        updateSummary();
    }

    function updateSliderValue($slot, $slider, playerName) {
        const minutes = parseInt($slider.val(), 10);
        const $position = $slot.closest('.position');
        const playerTotal = calculatePlayerTotal(playerName);
        const newPlayerTotal = playerTotal - ($slot.data('minutes') || 0) + minutes;
        const positionTotal = calculatePositionTotal($position);

        if (newPlayerTotal > 48) {
            $slider.val(48 - (playerTotal - ($slot.data('minutes') || 0)));
            alert(`${playerName} cannot exceed 48 total minutes.`);
        } else if (positionTotal - ($slot.data('minutes') || 0) + minutes > 48) {
            $slider.val(48 - (positionTotal - ($slot.data('minutes') || 0)));
            alert(`This position cannot exceed 48 total minutes.`);
        }

        $slot.data('minutes', parseInt($slider.val(), 10));
        $slot.find('.minutes-display').text(`${$slider.val()} mins`);
        updateSummary();
    }

    $('.positions').on('click', '.add-slot', function() {
        const $position = $(this).closest('.position');
        addSlot($position);
    });

    $('.positions').on('click', '.remove-slot', removeSlot);

    function initPositions() {
        const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
        const $positionsContainer = $('.positions-container');

        positions.forEach(position => {
            const newPosition = $(`
                <div class="position" data-position="${position}">
                    <div class="position-header">
                        <h3>${position} <span class="position-minutes">0/48</span></h3>
                        <button class="add-slot">Add Slot</button>
                    </div>
                    <div class="slot empty-slot">
                        <span>Empty Slot</span>
                    </div>
                    <div class="minutes-warning" style="display: none; color: red;"></div>
                </div>
            `);
            $positionsContainer.append(newPosition);
        });
    }

    function clearLineup() {
        $('.position').each(function() {
            $(this).find('.slot').not(':first').remove();
            const $firstSlot = $(this).find('.slot:first');
            $firstSlot.empty().append('<span>Empty Slot</span>').removeClass('filled-slot').addClass('empty-slot');
            $firstSlot.data('minutes', 0); // Reset minutes data
        });
        updateSummary();
        updateAddCustomPlayerButton();
    }

    function addCustomPlayer(teamName, playerName) {
        if (!customPlayers[teamName]) {
            customPlayers[teamName] = [];
        }
        customPlayers[teamName].push(playerName);
        updatePlayerDropdown(teamName);
    }

    function updatePlayerDropdown(team) {
        const $playerDropdown = $('#player-dropdown');
        $playerDropdown.empty().append($('<option>', {
            value: "",
            text: "Select a player"
        }));
        
        if (team && nbaTeams[team]) {
            nbaTeams[team].forEach(player => {
                $playerDropdown.append($('<option>', {
                    value: player,
                    text: player
                }));
            });

            // Add custom players
            if (customPlayers[team]) {
                customPlayers[team].forEach(player => {
                    $playerDropdown.append($('<option>', {
                        value: player,
                        text: player + ' (Custom)'
                    }));
                });
            }

            $('#action-text').text(`Select a player from ${team}, then click on an empty slot to add them.`);
            $playerDropdown.prop('disabled', false);
        } else {
            $('#action-text').text('Select a team and a player, then click on an empty slot to add them.');
            $playerDropdown.prop('disabled', true);
        }

        updateAddCustomPlayerButton();
    }

    function updateAddCustomPlayerButton() {
        $('#add-custom-player').prop('disabled', !currentTeam);
    }

    $(document).on('change', '#team-dropdown', function() {
        const selectedTeam = $(this).val();
        if (selectedTeam !== currentTeam) {
            if (currentTeam && $('.filled-slot').length > 0) {
                if (confirm("Changing teams will clear the current lineup. Are you sure?")) {
                    clearLineup();
                    currentTeam = selectedTeam;
                    updatePlayerDropdown(selectedTeam);
                } else {
                    $(this).val(currentTeam);
                    return;  // Exit the function if the user cancels
                }
            } else {
                currentTeam = selectedTeam;
                updatePlayerDropdown(selectedTeam);
            }
        }
        
        // Handle the case when no team is selected
        if (!selectedTeam) {
            currentTeam = null;
            updatePlayerDropdown(null);
        }

        updateAddCustomPlayerButton();
    });

    $('#clear-lineup').on('click', function() {
        if (confirm("Are you sure you want to clear the entire lineup?")) {
            clearLineup();
            currentTeam = null;
            $('#team-dropdown').val('');
            $('#player-dropdown').empty().append($('<option>', {
                value: "",
                text: "Select a player"
            }));
            $('#action-text').text('Select a team and a player, then click on an empty slot to add them.');
            updateAddCustomPlayerButton();
        }
    });

    function exportAsImage() {
        updateSummary();
    
        setTimeout(() => {
            const chartImages = [];
            $('.player-summary canvas').each(function(index) {
                const canvas = this;
                const chart = Chart.getChart(canvas);
                if (chart) {
                    chart.render();
                    chartImages.push({
                        img: canvas.toDataURL('image/png'),
                        player: $(canvas).closest('.player-summary').find('span').text()
                    });
                }
            });
    
            const exportContainer = document.createElement('div');
            exportContainer.style.padding = '50px';
            exportContainer.style.backgroundColor = 'white';
            exportContainer.style.width = '1400px';
            exportContainer.style.position = 'absolute';
            exportContainer.style.left = '-9999px';
            exportContainer.style.boxSizing = 'border-box';
    
            // Add title
            exportContainer.innerHTML += `<h1 style="text-align: center; margin-bottom: 15px;">${document.querySelector('h1').textContent}</h1>`;
    
            // Add team name
            const teamName = $('#team-dropdown').val() || 'No Team Selected';
            exportContainer.innerHTML += `<h2 style="text-align: center; margin-bottom: 15px; color: #3498db;">${teamName}</h2>`;
    
            // Add positions
            const positionsContainer = document.createElement('div');
            positionsContainer.style.display = 'flex';
            positionsContainer.style.justifyContent = 'space-between';
            positionsContainer.style.flexWrap = 'nowrap';
            positionsContainer.style.marginBottom = '25px';
            positionsContainer.style.width = '100%';
    
            $('.position').each(function() {
                const positionClone = document.createElement('div');
                positionClone.style.width = 'calc(20% - 10px)';
                positionClone.style.flexShrink = '0';
                positionClone.style.margin = '0 5px';
                positionClone.style.padding = '10px';
                positionClone.style.boxSizing = 'border-box';
                positionClone.style.border = '1px solid #ccc';
    
                const positionHeader = document.createElement('h3');
                positionHeader.textContent = $(this).find('h3').text();
                positionClone.appendChild(positionHeader);
    
                $(this).find('.slot').each(function() {
                    const slotClone = document.createElement('div');
                    slotClone.style.marginBottom = '10px';
                    
                    const playerName = $(this).find('.player').data('name');
                    if (playerName) {
                        slotClone.textContent = playerName + ': ';
                        const minutes = $(this).data('minutes');
                        const svg = createSliderSVG(minutes, 48);
                        slotClone.appendChild(svg);
                    } else {
                        slotClone.textContent = 'Empty Slot';
                    }
    
                    positionClone.appendChild(slotClone);
                });
    
                positionsContainer.appendChild(positionClone);
            });
    
            exportContainer.appendChild(positionsContainer);
    
            // Add legend
            const legendClone = document.querySelector('#position-legend').cloneNode(true);
            legendClone.style.marginBottom = '25px';
            legendClone.style.marginTop = '25px';
            exportContainer.appendChild(legendClone);
    
            // Add summary with chart images
            const summaryContainer = document.createElement('div');
            summaryContainer.style.display = 'flex';
            summaryContainer.style.flexWrap = 'wrap';
            summaryContainer.style.justifyContent = 'center';
            chartImages.forEach(({img, player}) => {
                summaryContainer.innerHTML += `
                    <div style="margin: 15px; text-align: center;">
                        <p style="margin: 5px 0;">${player}</p>
                        <img src="${img}" width="150" height="150">
                    </div>
                `;
            });
            exportContainer.appendChild(summaryContainer);
    
            // Add footer
            exportContainer.innerHTML += `<footer style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;"><p>&copy; Kenavoga 2024</p></footer>`;
    
            document.body.appendChild(exportContainer);
    
            html2canvas(exportContainer, {
                scale: 2,
                logging: false,
                useCORS: true,
                width: 1400,
                height: exportContainer.offsetHeight + 200,
                onclone: function(clonedDoc) {
                    const clonedContainer = clonedDoc.body.querySelector('div');
                    clonedContainer.style.width = '1400px';
                }
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = 'minzVIZ_export.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
                document.body.removeChild(exportContainer);
            });
        }, 1000);
    }

    $('#export-image').on('click', exportAsImage);

    function generateShareableLink() {
        const state = {
            team: currentTeam,
            positions: {},
            customPlayers: customPlayers[currentTeam] || []
        };
    
        $('.position').each(function() {
            const position = $(this).data('position');
            state.positions[position] = [];
            $(this).find('.slot').each(function() {
                const playerName = $(this).find('.player').data('name');
                const minutes = $(this).data('minutes');
                if (playerName) {
                    state.positions[position].push({ name: playerName, minutes: minutes });
                }
            });
        });
    
        const stateString = JSON.stringify(state);
        const encodedState = encodeURIComponent(stateString);
        const shareableLink = `${window.location.origin}${window.location.pathname}?state=${encodedState}`;
        
        navigator.clipboard.writeText(shareableLink).then(function() {
            alert("Shareable link has been copied to your clipboard!");
        }, function(err) {
            console.error('Could not copy text: ', err);
            alert("Failed to copy link to clipboard. Please check the console for the link.");
            console.log(shareableLink);
        });
    }

    $('#generate-link').on('click', generateShareableLink);

    function loadStateFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const stateParam = urlParams.get('state');
        if (stateParam) {
            const state = JSON.parse(decodeURIComponent(stateParam));
            currentTeam = state.team;
            $('#team-dropdown').val(currentTeam);

            // Load custom players
            if (state.customPlayers) {
                customPlayers[currentTeam] = state.customPlayers;
            }

            updatePlayerDropdown(currentTeam);

            clearLineup(); // Clear existing lineup before loading new state

            Object.entries(state.positions).forEach(([position, players]) => {
                const $position = $(`.position[data-position="${position}"]`);
                players.forEach((player, index) => {
                    if (index === 0) {
                        const $slot = $position.find('.slot:first');
                        addPlayerToSlot($slot, player.name);
                        $slot.find('input[type="range"]').val(player.minutes).trigger('input');
                    } else {
                        const $newSlot = $('<div class="slot empty-slot"></div>');
                        $position.append($newSlot);
                        addPlayerToSlot($newSlot, player.name);
                        $newSlot.find('input[type="range"]').val(player.minutes).trigger('input');
                    }
                });
            });

            updateSummary();
            updateAddCustomPlayerButton();
        }
    }

    // Add custom player modal functionality
    $('#add-custom-player').on('click', function() {
        $('#custom-player-modal').css('display', 'block');
    });

    $('#close-modal').on('click', function() {
        $('#custom-player-modal').css('display', 'none');
    });

    $('#save-custom-player').on('click', function() {
        const customPlayerName = $('#custom-player-name').val().trim();
        if (customPlayerName && currentTeam) {
            addCustomPlayer(currentTeam, customPlayerName);
            $('#custom-player-modal').css('display', 'none');
            $('#custom-player-name').val('');
        } else {
            alert('Please enter a player name and select a team.');
        }
    });

    initPositions();
    fetchNBATeams();  // Start by fetching teams and players
    updateSummary();
    loadStateFromURL();
});