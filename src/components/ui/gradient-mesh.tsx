type GradientMeshProps = {
  soft?: boolean;
};

export default function GradientMesh({ soft = false }: GradientMeshProps) {
  return (
    <div aria-hidden className={`gradient-mesh ${soft ? "gradient-mesh-soft" : "gradient-mesh-bold"}`}>
      <div className="mesh-orb mesh-orb-cyan" />
      <div className="mesh-orb mesh-orb-violet" />
      <div className="mesh-orb mesh-orb-emerald" />
      <div className="mesh-orb mesh-orb-indigo" />
      <div className="mesh-vignette" />
    </div>
  );
}
