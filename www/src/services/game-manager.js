import axios from 'axios'
import Store from '../store'

let api = axios.create({
    baseURL: 'http://localhost:3000/api/',
    timeout: 30000,
    withCredentials: true
})

let handleError = (err) => {
    Store.state.error = err
    Store.state.isLoading = false
    console.warn(err)
}

let gameManager = {
    resetUserData() {
        Store.state.gameSession = {}
        Store.state.activeUser.cards = []
        Store.state.activeUser.injuries = []
        Store.state.activeUser.createdGame = false
        Store.state.hand = []
        Store.state.injuryHand = []
        Store.state.chat = []
    },

    getPlayers(gameName) {
        api('game/' + gameName + '/players').then(res => {
            Store.state.players = res.data.data
            if (Store.state.activeUser) {
                for (var i = 0; i < Store.state.players.length; i++) {
                    var player = Store.state.players[i];
                    if (player._id === Store.state.activeUser._id) {
                        this.getHand(player._id)
                        this.getInjuryHand(player._id)
                    }
                }
            }
        })
    },

    dealHands(game) {
        if (!game.playersInGameSession) return;
        var players = game.playersInGameSession
        var playerHands = []
        for (var i = 0; i < players.length; i++) {
            var player = players[i];
            playerHands.push(this.dealHand(player._id))
        }
        Promise.all(playerHands).then(values => {
            return new Promise((resolve, reject) => {
                resolve(values)
            })
        })
    },

    dealHand(id) {
        let hand = Store.state.deck.draw(5)
        api.put('users/' + id + '/cards', { cards: hand }).then(res => {
            if (Store.state.activeUser._id === id) {
                this.getHand(id)
            }
        }).catch(handleError)
    },

    getHand(id) {
        api('users/' + id + '/cards').then(cards => {
            Store.state.hand = cards.data.data
        }).catch(handleError)
    },

    getInjuryHand(id) {
        api('users/' + id + '/injuries').then(injuries => {
            Store.state.injuryHand = injuries.data.data
        }).catch(handleError)
    },

    getDeck(gameName) {
        api('game/' + gameName + '/deck').then(deck => {
            Store.state.deck.cards = deck.data.data
        }).catch(handleError)
    },

    updateDeck(id) {
        api.put('games/' + id, { deck: Store.state.deck.cards }).then(deck => {
            // Hrmm
            return new Promise((resolve, reject) => {
                resolve(deck)
            })
        }).catch(handleError)
    },

    updateInjuryDeck(id) {
        api.put('games/' + id, { injuryDeck: Store.state.injuryDeck.cards }).then(deck => {
            // Hrmm
            return new Promise((resolve, reject) => {
                resolve(deck)
            })
        }).catch(handleError)
    },

    startTurn(game, cb) {
        if (!game.playersInGameSession) return;

        let players = game.playersInGameSession
        let player = players[Math.floor(Math.random() * players.length)]
        console.log(player)
        if (player._id) {
            api.put('game/' + game._id + '/turn', { currentTurn: player._id, activeTurn: player._id, phase: 1 }).then(turn => {
                let user = turn.data.data
                Store.state.currentTurn = user.currentTurn
                Store.state.activeTurn = user.activeTurn
                var playerName = Store.state.players.find(function (banana) {
                    return banana._id == player._id
                })
                cb(game.name, user, player.name)
            }).catch(handleError)
        }
    },

    nextTurn(game, cb) {
        let players = Store.state.players
        var currentPlayer = Store.state.currentTurn
        var currentPlayerIndex = players.findIndex(function (nPlayer) {
            return nPlayer._id == currentPlayer
        })
        if (players[currentPlayerIndex + 1]) {
            var nextPlayer = players[currentPlayerIndex + 1]
        } else {
            var nextPlayer = players[0]
        }
        if (nextPlayer) {
            console.log(nextPlayer)
            api.put('game/' + game._id + '/turn', { currentTurn: nextPlayer._id, activeTurn: nextPlayer._id, phase: 1 }).then(turn => {
                var user = turn.data.data
                Store.state.currentTurn = user.currentTurn
                Store.state.activeTurn = user.activeTurn
                cb(game.name, user, nextPlayer.name)
            }).catch(handleError)
        }

    },

    nextPhase(game, cb) {
        let phase = game.turnPhase + 1
        api.put('game/' + game._id + '/phase', { phase: phase }).then(nextPhase => {
            cb(game.name, phase)
        }).catch(handleError)
    },

    nextActiveTurn() {

    },

    getTargetType(card) {
        let index = card.index
        switch(index) {
            // use index to determine target types
            // case 1, 5, 12, 14, ...
            default:
                return "Any"
        }
    }
}


export default gameManager