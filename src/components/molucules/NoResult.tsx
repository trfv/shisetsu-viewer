import Box from "@material-ui/core/Box";
import React, { FC } from "react";

const NoResult: FC = () => {
  return (
    <Box
      width="100%"
      height="100%"
      display="flex"
      justifyContent="center"
      alignItems="center"
      flexDirection="column"
    >
      該当するデータがありません。
    </Box>
  );
};

export default NoResult;
