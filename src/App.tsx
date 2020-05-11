import React, { FC } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import Institution from "./components/pages/Institution";
import Reservation from "./components/pages/Reservation";
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
          <Route path={routePath.institution} component={Institution} exact />
          <Route path={routePath.root} component={Reservation} />
        </Switch>
        <Footer />
      </BrowserRouter>
    </>
  );
};

export default App;
