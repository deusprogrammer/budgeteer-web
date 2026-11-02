const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '<', '0', 'C'];

export default function NumberPad({ onPress }) {
  return (
    <div className="number-pad">
      {KEYS.map((key) => (
        <button key={key} type="button" className="circle-button" onClick={() => onPress(key)}>
          {key}
        </button>
      ))}
    </div>
  );
}
