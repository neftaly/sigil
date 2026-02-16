import { useState } from "react";

import { Box, Text } from "@charui/react";
import { CharuiCanvas } from "@charui/dom";

import { Button } from "./Button.tsx";
import { Checkbox } from "./Checkbox.tsx";
import { Input, type InputChangeEvent } from "./Input.tsx";
import { Progress } from "./Progress.tsx";
import { Radio, RadioGroup } from "./Radio.tsx";

export default {
  title: "Components/FormElements",
};

export const ButtonDemo = () => {
  const [count, setCount] = useState(0);
  return (
    <CharuiCanvas width={30} height={5}>
      <Box flexDirection="column" width={30} height={5}>
        <Text>{`Pressed ${count} times`}</Text>
        <Button onPress={() => setCount((n) => n + 1)}>Click me</Button>
      </Box>
    </CharuiCanvas>
  );
};

export const CheckboxDemo = () => {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  return (
    <CharuiCanvas width={30} height={3}>
      <Box flexDirection="column" width={30} height={3}>
        <Checkbox checked={a} onChange={setA} label="Accept terms" />
        <Checkbox checked={b} onChange={setB} label="Subscribe" />
        <Checkbox checked={false} label="Disabled" disabled />
      </Box>
    </CharuiCanvas>
  );
};

export const RadioDemo = () => {
  const [plan, setPlan] = useState("free");
  return (
    <CharuiCanvas width={20} height={4}>
      <Box flexDirection="column" width={20} height={4}>
        <Text>Plan:</Text>
        <RadioGroup value={plan} onChange={setPlan}>
          <Radio value="free" label="Free" />
          <Radio value="pro" label="Pro" />
          <Radio value="enterprise" label="Enterprise" />
        </RadioGroup>
      </Box>
    </CharuiCanvas>
  );
};

export const ProgressDemo = () => (
  <CharuiCanvas width={30} height={3}>
    <Box flexDirection="column" width={30} height={3}>
      <Progress value={0.42} width={24} showLabel />
      <Progress value={0.8} width={24} filledColor="#4f4" />
      <Progress value={1} width={24} showLabel />
    </Box>
  </CharuiCanvas>
);

export const KitchenSink = () => {
  const [name, setName] = useState<InputChangeEvent>({
    value: "",
    selectionStart: 0,
    selectionEnd: 0,
    scrollOffset: 0,
  });
  const [terms, setTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [plan, setPlan] = useState("free");
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState("");

  return (
    <CharuiCanvas width={40} height={22}>
      <Box border width={40} height={22} flexDirection="column">
        <Text bold> Form Demo</Text>
        <Text> </Text>
        <Text> Name:</Text>
        <Box border width={38} height={3} marginLeft={1}>
          <Input
            value={name.value}
            selectionStart={name.selectionStart}
            selectionEnd={name.selectionEnd}
            scrollOffset={name.scrollOffset}
            showCursor={focused === "name"}
            width={36}
            placeholder="John Doe"
            onChange={setName}
            onFocus={() => setFocused("name")}
          />
        </Box>
        <Box flexDirection="column" marginLeft={1}>
          <Checkbox
            checked={terms}
            onChange={setTerms}
            label="Accept terms"
          />
          <Checkbox
            checked={newsletter}
            onChange={setNewsletter}
            label="Subscribe"
          />
        </Box>
        <Text> </Text>
        <Text> Plan:</Text>
        <Box marginLeft={1}>
          <RadioGroup value={plan} onChange={setPlan}>
            <Radio value="free" label="Free" />
            <Radio value="pro" label="Pro" />
            <Radio value="enterprise" label="Enterprise" />
          </RadioGroup>
        </Box>
        <Text> Upload:</Text>
        <Box marginLeft={1}>
          <Progress value={0.42} width={30} showLabel />
        </Box>
        <Text> </Text>
        <Box marginLeft={1}>
          <Button onPress={() => setSubmitted(true)}>
            {submitted ? "Submitted!" : "Submit"}
          </Button>
        </Box>
      </Box>
    </CharuiCanvas>
  );
};
