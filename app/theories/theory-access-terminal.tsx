"use client";

import CodeAccessDock from "../components/code-access-dock";
import DosCodeBox from "../components/dos-code-box";

export default function TheoryAccessTerminal() {
  return (
    <CodeAccessDock>
      {(mode) => (
        <DosCodeBox
          ariaLabel={`Enter ${mode} theory code`}
          autoFocus
          id={`theory-${mode}-code`}
          label={mode === "rc" ? "RC code" : "classified code"}
          maxLength={7}
          onSubmitCode={() => undefined}
        />
      )}
    </CodeAccessDock>
  );
}
