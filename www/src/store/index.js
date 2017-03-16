import axios from 'axios'
import io from 'socket.io-client'
import Shuffle from 'shuffle'


let api = axios.create({
    baseURL: 'http://localhost:3000/api/',
    timeout: 30000,
    withCredentials: true
})


let client = io.connect('http://localhost:3000/');

client.on('CONNECTED', function (data) {
    console.log(data);


});

client.on('message', function (data) {
    debugger
    console.log(data);
    if (data.name && data.text) {
        state.chat.push(data)
    }
});

let state = {
    activeUser: {},
    games: [],
    gameSession: {},
    players: [],
    isLoading: false,
    chat: [],
    error: {},
    deck: {},
    hand: [],
    injuryDeck: {},
    injuryHand: []
}

let handleError = (err) => {
    state.error = err
    state.isLoading = false
}

let gameStore = {
    // Time to fix shit
    //ALL DATA LIVES IN THE STATE
    state,
    //ACTIONS are responsible for managing all async requests
    actions: {
        // USER AUTHENTICATION
        login(email, password) {
            state.isLoading = true
            api.post('login', {
                email: email,
                password: password
            }).then(res => {
                state.activeUser = res.data.data
                state.isLoading = false
            }).catch(handleError)
        },
        register(username, email, password, age) {
            state.isLoading = true
            api.post('register', {
                name: username,
                email: email,
                password: password,
                age: age
            }).then(res => {
                this.login(email, password)
            }).catch(handleError)
        },
        submitText(name, text, gs) {
            console.log("gamesession", gs)
            client.emit('message', {
                name: name,
                text: text,
                roomId: gs._id
            });
        },
        logout() {
            api.delete('logout').then(res => {
                state.activeUser = {}
            }).catch(handleError)
        },
        authenticate() {
            api('authenticate').then(res => {
                if (res.data.data) {
                    state.activeUser = res.data.data
                    state.loading = false
                }
            }).catch(handleError)
        },
        // GET GAMES
        getGames() {
            api('lobby/').then(res => {
                state.games = res.data.data
            }).catch(handleError)
        },
        getGame(gameName) {
            api('game/' + gameName).then(res => {
                state.gameSession = res.data.data

            }).catch(handleError)
        },
        createGame(user, gameName, maxPlayers, cb) {
            let game = {
                name: gameName,
                creatorId: user._id,
                maxPlayers: maxPlayers
            }
            state.activeUser.createdGame = true
            api.post('games', game).then(res => {
                if (res.data.data.name) {
                    this.getGame(res.data.data.name)
                    cb(gameName)
                }

            }).catch(handleError)
        },
        joinGame(user, gameName, cb) {
            //console.log(gameName)
            api.post('joingame', { user: user, name: gameName }).then(res => {
                console.log(res.data.data)
                cb(gameName)
                console.log("attempting to join room")
                client.emit('joining', { name: gameName })
                client.in(gameName).on('joined', function () {
                    console.log("Joined Room")
                    // console.log(data)
                })
            }).catch(handleError)
        },
        leaveGame(user, gameName) {
            api.post('leavegame', { userId: user._id, name: gameName }).then(res => {
                state.gameSession = {}
            }).catch(handleError)
        },
        getPlayers(gameName) {
            api('game/' + gameName + '/players').then(res => {
                state.players = res.data.data
                console.log(res.data.data)

                if (state.activeUser) {
                    console.log("Find the one")
                    var players = state.players
                    for (var i = 0; i < players.length; i++) {
                        var player = players[i];
                        console.log(player)
                        if (player._id === state.activeUser._id) {
                            state.hand = player.cards
                            console.log(state.hand)
                        }
                    }
                }
            })
        },
        drawCard(id) {
            if (state.activeUser) {
                let card = state.deck.draw()
                api.put('users/' + id,
                    { cards: state.hand }
                ).then(res => {
                    if (state.activeUser._id == id) {
                        api('users' + id + '/cards').then(cards => {
                            state.hand = cards.data.data
                        })
                    }
                }).catch(handleError)

                state.hand.push(hand)
            }
        },
        getInjuryDeck() {
            api('injuries').then(res => {
                let injuryDeck = Shuffle.shuffle({ deck: res.data.data })
                state.injuryDeck = injuryDeck
            }).catch(handleError)
        },
        drawInjury() {
            if (state.activeUser) {
                let injuryHand = state.injuryDeck.draw()
                state.injuryHand.push(injuryHand)
            }
        },
        deleteGame(id) {
            api.delete('games/' + id)
                .then(res => {
                    console.log(res)
                    this.getGames()
                })
                .catch(handleError)
        },
        startGame(id) {
            api.post('startgame', { id: id }).then(res => {
                if (res.data.data.canStart) {

                    //Shuffle the deck
                    api('fights').then(cards => {
                        let deck = Shuffle.shuffle({ deck: cards.data.data })
                        state.deck = deck
                        dealHands(res.data.data.game)
                        updateDeck(id)
                    })

                }
            })
        }
    }
}

let dealHands = (game) => {
    if (!game.playersInGameSession) return;
    var players = game.playersInGameSession
    for (var i = 0; i < players.length; i++) {
        var player = players[i];
        dealHand(player._id)
    }
}

let dealHand = (id) => {
    let hand = state.deck.draw(5)
    api.put('users/' + id + '/cards',
        { cards: hand }
    ).then(res => {
        console.log(res.data.data)
        if (state.activeUser._id === id) {
            console.log("looks good")
            api('users' + id + '/cards').then(cards => {
                state.hand = cards.data.data
                console.log(state.hand)
            })
        }
    }).catch(handleError)
}

let updateDeck = (id) => {
    api.put('games/' + id, { deck: state.deck.cards }).then(deck => {
        console.log(deck.data.data)
    })
}

export default gameStore