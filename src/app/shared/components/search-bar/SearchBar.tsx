import { useState } from "react";
import * as S from "./SearchBar.styles";

const MyComponent = () => {
  const [textFieldValue, setTextFieldValue] = useState<string>("Hola");

  const handleSearch = (labelOptionValue: string) => {
    console.log(
      "+++ Inside handleSearch - labelOptionValue: " + labelOptionValue
    );
  };

  return (
    <S.Search
      value={textFieldValue}
      onChange={(newValue: string) => setTextFieldValue(newValue)}
      onSearch={handleSearch}
    />
  );
};

export default MyComponent;
