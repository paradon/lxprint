import {
  useState,
  useEffect,
  useRef,
  use,
  type ChangeEventHandler,
} from "react";

import { PrinterContext } from "./context.tsx";

type AlignmentType = "left" | "center" | "right";

function LabelSvg({
  text,
  onChange,
  align,
  font,
}: {
  text: string;
  onChange: (svg: string, width: number, height: number) => void;
  align: AlignmentType;
  font: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (ref.current) {
      const textElement = ref.current.getElementById(
        "labelText",
      ) as SVGTextElement;
      const bbox = textElement.getBBox();
      setWidth(bbox.width);
      setHeight(bbox.height);
      onChange(ref.current.outerHTML, bbox.width, bbox.height);
    }
  }, [text, width, height, align, font]);

  const [xPos, textAnchor] = ((): [number, "start" | "middle" | "end"] => {
    switch (align) {
      case "left":
        return [0, "start"];
      case "center":
        return [width / 2, "middle"];
      case "right":
        return [width, "end"];
      default:
        return [0, "start"];
    }
  })();

  return (
    <div style={{ visibility: "hidden", position: "absolute" }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox={`0, 0, ${width} ${height}`}
        ref={ref}
        style={{ width: width, height: height }}
      >
        <text
          x={xPos}
          y="0"
          id="labelText"
          style={{ textAnchor: textAnchor, fontFamily: font }}
        >
          {text.split("\n").map((x, i) => (
            <tspan key={i} x={xPos} dy="1em">
              {x}
            </tspan>
          ))}
        </text>
      </svg>
    </div>
  );
}

function LabelCanvas({
  text,
  align,
  font,
  onChangeBitmap,
}: {
  text: string;
  align: AlignmentType;
  font: string;
  onChangeBitmap: (x: ImageData) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  const [svgData, setSvgData] = useState<string>("");
  const [width, setWidth] = useState<number>(384);
  const [height, setHeight] = useState<number>(0);

  const onSvgChange = (s: string, w: number, h: number) => {
    setSvgData(s);
    setWidth(w);
    setHeight(h);
  };

  useEffect(() => {
    const image = new Image();

    if (ref.current) {
      const context = ref.current.getContext("2d");
      if (!context) throw new Error("No context from canvas");
      image.onload = () => {
        if (ref.current) {
          context.clearRect(0, 0, ref.current.width, ref.current.height);
          context.drawImage(image, 0, 0, 384, 384 * (height / width));
          onChangeBitmap(
            context.getImageData(0, 0, 384, 384 * (height / width)),
          );
        }
      };

      image.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
    }
  }, [svgData]);

  return (
    <>
      <LabelSvg
        text={text}
        onChange={(s, w, h) => onSvgChange(s, w, h)}
        align={align}
        font={font}
      />
      <canvas
        ref={ref}
        width="384"
        height={384 * (height / width)}
        style={{ border: "1px solid black", padding: "10px" }}
      />
    </>
  );
}

function TextAlignButton({
  val,
  text,
  align,
  onChangeHandler,
}: {
  val: AlignmentType;
  text: string;
  align: AlignmentType;
  onChangeHandler: ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <label htmlFor={val}>
      <input
        type="radio"
        name="align"
        value={val}
        id={val}
        checked={align === val}
        onChange={onChangeHandler}
      />
      {text}
    </label>
  );
}

function FontSelect({
  font,
  setFont,
}: {
  font: string;
  setFont: (x: string) => void;
}) {
  return (
    <select value={font} onChange={(e) => setFont(e.target.value)}>
      <option value="serif">serif</option>
      <option value="sans-serif">sans-serif</option>
      <option value="cursive">cursive</option>
      <option value="monospace">monospace</option>
      <option value="fantasy">fantasy</option>
    </select>
  );
}

function TextAlign({
  align,
  setAlign,
}: {
  align: AlignmentType;
  setAlign: (x: AlignmentType) => void;
}) {
  const onOptionChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    if (align === "left" || align === "center" || align === "right")
      setAlign(e.target.value as AlignmentType);
  };

  return (
    <div>
      <TextAlignButton
        val="left"
        text="Left"
        align={align}
        onChangeHandler={onOptionChange}
      />
      <TextAlignButton
        val="center"
        text="Center"
        align={align}
        onChangeHandler={onOptionChange}
      />
      <TextAlignButton
        val="right"
        text="Right"
        align={align}
        onChangeHandler={onOptionChange}
      />
    </div>
  );
}

export function LabelMaker() {
  const [text, setText] = useState("Hello");
  const [align, setAlign] = useState<"left" | "center" | "right">("left");
  const [bitmap, setBitmap] = useState<ImageData>();
  const [font, setFont] = useState<string>("sans-serif");

  const { printer, printerStatus } = use(PrinterContext);

  const canPrint = !!printer && printerStatus.state == "connected" && !!bitmap;

  const print = () => {
    if (canPrint) printer.print(bitmap);
  };

  return (
    <div>
      <LabelCanvas
        text={text}
        align={align}
        font={font}
        onChangeBitmap={(x: ImageData) => setBitmap(x)}
      />
      <div>
        <TextAlign align={align} setAlign={setAlign} />
        <FontSelect font={font} setFont={setFont} />
        <div>
          <textarea
            value={text}
            onChange={(x) => setText(x.target.value)}
            rows={4}
            cols={40}
          />
        </div>
        <button onClick={print} disabled={!canPrint}>
          Print
        </button>
      </div>
    </div>
  );
}
