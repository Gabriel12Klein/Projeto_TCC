const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function ConsumptionChart({
  data,
  year,
}: {
  data: { month: number; bottles: number }[];
  year: number;
}) {
  const width = 720;
  const height = 260;
  const padding = { top: 24, right: 18, bottom: 42, left: 42 };
  const max = Math.max(1, ...data.map((point) => point.bottles));
  const x = (index: number) => padding.left + index * ((width - padding.left - padding.right) / 11);
  const y = (value: number) =>
    height - padding.bottom - value * ((height - padding.top - padding.bottom) / max);
  const points = data.map((point, index) => `${x(index)},${y(point.bottles)}`).join(' ');
  const total = data.reduce((sum, point) => sum + point.bottles, 0);

  return (
    <div>
      <svg
        className="h-auto w-full min-w-[620px]"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Consumo mensal de ${year}: ${total} garrafa(s) no total.`}
      >
        {[0, max].map((value) => (
          <g key={value}>
            <line x1={padding.left} x2={width - padding.right} y1={y(value)} y2={y(value)} stroke="#e4d7c8" />
            <text x={padding.left - 10} y={y(value) + 4} textAnchor="end" fill="#715f59" fontSize="12">
              {value}
            </text>
          </g>
        ))}
        <polyline
          fill="none"
          stroke="#7d1d2d"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
        {data.map((point, index) => (
          <g key={point.month}>
            <circle cx={x(index)} cy={y(point.bottles)} r="5" fill="#d0a565">
              <title>{`${months[index]}: ${point.bottles} garrafa(s)`}</title>
            </circle>
            <text x={x(index)} y={height - 16} textAnchor="middle" fill="#715f59" fontSize="12">
              {months[index]}
            </text>
            <text
              x={x(index)}
              y={Math.max(14, y(point.bottles) - 10)}
              textAnchor="middle"
              fill="#5b0c1b"
              fontSize="12"
              fontWeight="600"
            >
              {point.bottles}
            </text>
          </g>
        ))}
      </svg>
      {!total && <p className="mt-3 text-sm text-[#715f59]">Ainda não há consumo registrado em {year}.</p>}
    </div>
  );
}
