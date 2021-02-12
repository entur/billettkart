import React from 'react'

import { Router, Switch, Route } from 'react-router-dom'
import { createBrowserHistory } from 'history'

import Home from './pages/Home'

import './App.css'

export const history = createBrowserHistory()

function App() {
    return (
        <Router history={history}>
            <div className="app">
                <div className="app-content">
                    <Switch>
                        <Route path="/">
                            <Home />
                        </Route>
                    </Switch>
                </div>
            </div>
        </Router>
    )
}

export default App
