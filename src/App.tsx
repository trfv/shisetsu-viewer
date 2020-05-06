import React, { FC } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import Reservation from "./components/pages/Reservation";
import Search from "./components/pages/Search";
import Footer from "./components/templates/Footer";
import Header from "./components/templates/Header";
import { routePath } from "./constants/routes";

const App: FC = () => {
  return (
    <>
      <BrowserRouter>
        <Header />
        <Switch>
          <Route path={routePath.reservation} component={Reservation} exact />
          <Route path={routePath.search} component={Search} exact />
          <Route path={routePath.root} component={Reservation} />
        </Switch>
        <Footer />
      </BrowserRouter>
    </>
  );
};

export default App;
