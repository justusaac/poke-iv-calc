import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Accordion, Badge, Modal, OverlayTrigger, Popover } from 'react-bootstrap';
import { QuestionCircle } from 'react-bootstrap-icons';
import PokeBallIcon from "./PokeBallIcon";
import 'bootstrap/dist/css/bootstrap.min.css';

const STATS = ['HP', 'Attack', 'Defense', 'Sp.Atk', 'Sp.Def', 'Speed'] as const;
type Stat = typeof STATS[number];
type NatureEffect = { inc: Stat | null; dec: Stat | null };
type Observation = { level: number; stats: Partial<Record<Stat, number>>; evs: Record<Stat, number> };
const calculateStat = (base: number, iv: number, ev: number, level: number, nature: number, isHP: boolean) => {
  const baseCalc = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
  if (isHP) return baseCalc + level + 10;
  return Math.floor((baseCalc + 5) * nature);
};

const NATURES: Record<string, NatureEffect> = {
  Hardy: {inc: null, dec: null},
  Bashful: {inc: null, dec: null},
  Docile: {inc: null, dec: null},
  Quirky: {inc: null, dec: null},
  Serious: {inc: null, dec: null},
  Lonely: {inc: 'Attack', dec: 'Defense'},
  Adamant: {inc: 'Attack', dec: 'Sp.Atk'},
  Naughty: {inc: 'Attack', dec: 'Sp.Def'},
  Brave: {inc: 'Attack', dec: 'Speed'},
  Bold: {inc: 'Defense', dec: 'Attack'},
  Impish: {inc: 'Defense', dec: 'Sp.Atk'},
  Lax: {inc: 'Defense', dec: 'Sp.Def'},
  Relaxed: {inc: 'Defense', dec: 'Speed'},
  Modest: {inc: 'Sp.Atk', dec: 'Attack'},
  Mild: {inc: 'Sp.Atk', dec: 'Defense'},
  Rash: {inc: 'Sp.Atk', dec: 'Sp.Def'},
  Quiet: {inc: 'Sp.Atk', dec: 'Speed'},
  Calm: {inc: 'Sp.Def', dec: 'Attack'},
  Gentle: {inc: 'Sp.Def', dec: 'Defense'},
  Careful: {inc: 'Sp.Def', dec: 'Sp.Atk'},
  Sassy: {inc: 'Sp.Def', dec: 'Speed'},
  Timid: {inc: 'Speed', dec: 'Attack'},
  Hasty: {inc: 'Speed', dec: 'Defense'},
  Jolly: {inc: 'Speed', dec: 'Sp.Atk'},
  Naive: {inc: 'Speed', dec: 'Sp.Def'},
};
type Nature = keyof typeof NATURES;

const getPossibleIVs = (
  observed: number,
  base: number,
  ev: number,
  level: number,
  nature: number,
  isHP: boolean
) => {
  const possible: number[] = [];
  for (let iv = 0; iv <= 31; iv++) {
    if (calculateStat(base, iv, ev, level, nature, isHP) === observed) possible.push(iv);
  }
  return possible;
};

const App: React.FC = () => {
  const [baseStats, setBaseStats] = useState<Record<Stat, number>>({
    HP: 80, Attack: 125, Defense: 75, 'Sp.Atk': 40, 'Sp.Def': 95, Speed: 85
  });
  const [nature, setNature] = useState<NatureEffect>({ inc: null, dec: null });
  const [natureName, setNatureName] = useState<Nature | "Other">("Other");
  useEffect(() => {
    if(natureName !== "Other" && NATURES[natureName].inc === nature.inc && NATURES[natureName].dec === nature.dec){
      return;
    }
    for(let name of Object.keys(NATURES)){
      const effect: NatureEffect = NATURES[name];
      if(effect.inc === nature.inc && effect.dec === nature.dec){
        setNatureName(name);
        return;
      }
    }
    setNatureName("Other");
  }, [nature]);
  useEffect(() => {
    if(natureName !== "Other"){
      setNature(NATURES[natureName]);
    }
  }, [natureName]);

  const [observations, setObservations] = useState<Observation[]>([]);

  const initialEvs: Record<Stat, number> = {
    HP: 0, Attack: 0, Defense: 0, 'Sp.Atk': 0, 'Sp.Def': 0, Speed: 0
  };
  const [currObservation, setCurrObservation] = useState<Observation>({ level: 0, stats: {}, evs: {...initialEvs} });
  const [includeCurrObservation, setIncludeCurrObservation] = useState<boolean>(true);

  const getNatureMultiplier = useCallback((stat: Stat) => {
    if (nature.inc === stat && nature.dec !== stat) return 1.1;
    if (nature.dec === stat && nature.inc !== stat) return 0.9;
    return 1;
  }, [nature]);

  const possiblePrevObservationIVs = useMemo<Record<Stat, number[]>>(() => {
    const result: Record<Stat, number[]> = {
      HP: [], Attack: [], Defense: [], 'Sp.Atk': [], 'Sp.Def': [], Speed: []
    };

    STATS.forEach(stat => {
      let possible = Array.from({ length: 32 }, (_, i) => i);
      
      observations.forEach(({ level, stats, evs }) => {
        if (stats[stat] !== undefined) {
          const newPossible = getPossibleIVs(
            stats[stat]!,
            baseStats[stat],
            evs[stat],
            level,
            getNatureMultiplier(stat),
            stat === 'HP'
          );
          possible = possible.filter(iv => newPossible.includes(iv));
        }
      });
      
      result[stat] = possible;
    });

    return result;
  }, [baseStats, observations, getNatureMultiplier]);

  const possibleIVs = useMemo<Record<Stat, number[]>>(() => {
    const result: Record<Stat, number[]> = {...possiblePrevObservationIVs};
    if(includeCurrObservation){
      STATS.forEach(stat => {
        if (currObservation.stats[stat] !== undefined) {
          const newPossible = getPossibleIVs(
            currObservation.stats[stat]!,
            baseStats[stat],
            currObservation.evs[stat],
            currObservation.level,
            getNatureMultiplier(stat),
            stat === 'HP'
          );
          result[stat] = result[stat].filter(iv => newPossible.includes(iv));
        }
      });
    }
    return result;
  }, [baseStats, currObservation, possiblePrevObservationIVs, getNatureMultiplier, includeCurrObservation]);

  const updateLevelWithLowestStats = (level: number) => {
    const newStats = Object.fromEntries(STATS.map(stat => 
      [stat, calculateStat(baseStats[stat], possibleIVs[stat][0] ?? 0, currObservation.evs[stat], level, getNatureMultiplier(stat), stat === 'HP')]
    ))
    setCurrObservation({ level: level, stats: newStats, evs: currObservation.evs });
  }
  const addObservation = () => {
    setObservations([...observations, currObservation]);
    setCurrObservation({...currObservation, evs: {...currObservation.evs}});
    const newLevel = currObservation.level + 1 ?? 1;
    updateLevelWithLowestStats(newLevel);
  };
  useEffect(()=>{
    addObservation();
    observations.pop();
    setObservations([...observations])
  }, []);

  const updateObservedStat = (stat: Stat, value: number | undefined) => {
    setCurrObservation({
      ...currObservation,
      stats: { ...currObservation.stats, [stat]: value }
    });
  };
  const updateEV = (stat: Stat, value: number) => {
    setCurrObservation({
      ...currObservation,
      evs: {
        ...currObservation.evs,
        [stat]: Math.min(255, Math.max(0, value || 0))
      }
    })
  };

  const [obsAccordionActive, setObsAccordionActive] = useState<string | undefined>(undefined);

  const removeObservation = (index: number) => {
    setObservations(observations.filter((_, idx: number) => ((index !== -1) && (idx !== index))));
  };
  const editObservation = (index: number) => {
    setCurrObservation(observations[index]);
    removeObservation(index);
    //Programmatically open observation accordion item without locking it up
    setObsAccordionActive("1");
    setTimeout(setObsAccordionActive, 0);
  };

  const [modalShow, setModalShow] = useState<boolean>(false);
  const closeModal = () => setModalShow(false);
  //-1 special for deleting all items
  const [modalDeleteIndex, setModalDeleteIndex] = useState<number>(-1);
  const showModal = (index: number) => {
    setModalDeleteIndex(index);
    setModalShow(true);
  };

  return (
    <Container className="my-4">
      <span style={{position:"fixed", width:"100%", height:"100%", zIndex:"-99"}}>
        <PokeBallIcon thickness={0.05} color={"#bcdcff"} style={{rotate:"-20deg"}}/>
      </span>
      <h1 className="mb-4">Pokémon IV Calculator</h1>
      
      <Accordion defaultActiveKey="0" className="mb-4">
        <Accordion.Item eventKey="0">
          <Accordion.Header>Base Stats</Accordion.Header>
          <Accordion.Body>
            <Row xs={1} sm={3} lg={6}>
              {STATS.map(stat => (
                <Col key={stat} className="mb-3">
                  <Form.Group>
                    <Form.Label htmlFor={`base${stat}`}>{stat} Base</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      value={baseStats[stat]}
                      onChange={e => setBaseStats({
                        ...baseStats,
                        [stat]: Math.max(0, parseInt(e.target.value) || 0)
                      })}
                      id={`base${stat}`}
                    />
                  </Form.Group>
                </Col>
              ))}
            </Row>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="1">
          <Accordion.Header>Nature</Accordion.Header>
          <Accordion.Body>
            <Row>
              <Col sm={4}>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="natureName">Nature</Form.Label>
                  <Form.Select
                    value={natureName}
                    onChange={e => setNatureName(e.target.value)}
                    id="natureName"
                  >
                    <option value="Other">Other</option>
                    {Object.keys(NATURES).map(nat => (
                      <option key={nat} value={nat}>{nat}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col sm={4}>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="increasedStat">Increased Stat</Form.Label>
                  <Form.Select
                    value={nature.inc || ''}
                    onChange={e => setNature({
                      ...nature,
                      inc: e.target.value as Stat || null
                    })}
                    id="increasedStat"
                  >
                    <option value="">None</option>
                    {STATS.filter(s => s !== 'HP').map(stat => (
                      <option key={stat} value={stat}>+{stat}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col sm={4}>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="decreasedStat">Decreased Stat</Form.Label>
                  <Form.Select
                    value={nature.dec || ''}
                    onChange={e => setNature({
                      ...nature,
                      dec: e.target.value as Stat || null
                    })}
                    id="decreasedStat"
                  >
                    <option value="">None</option>
                    {STATS.filter(s => s !== 'HP').map(stat => (
                      <option key={stat} value={stat}>-{stat}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="2">
          <Accordion.Header>EVs</Accordion.Header>
          <Accordion.Body>
            <Row xs={1} sm={3} lg={6}>
              {STATS.map(stat => (
                <Col key={stat} className="mb-3">
                  <Form.Group>
                    <Form.Label htmlFor={`${stat}EVs`}>{stat} EVs</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      max="255"
                      value={currObservation.evs[stat]}
                      onChange={e => updateEV(stat, parseInt(e.target.value))}
                      id={`${stat}EVs`}
                    />
                  </Form.Group>
                </Col>
              ))}
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      <h2 className="mb-3">
        Observations&nbsp;
        <OverlayTrigger
          trigger="click"
          rootClose
          placement="bottom"
          overlay={
            <Popover>
              <Popover.Body>Log the observed stats of your Pokémon at different levels to narrow down its range of potential IVs.</Popover.Body>
            </Popover>
          }
        >
          <a tabIndex={0}><QuestionCircle size={16}/></a>
        </OverlayTrigger>
      </h2>

      <Modal show={modalShow} onHide={closeModal}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>Really delete {modalDeleteIndex !== -1 ? "this entry" : "all entries"}?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={()=>{removeObservation(modalDeleteIndex); closeModal()}}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>

      <Accordion key="currObservation" className="mb-3" defaultActiveKey="1" activeKey={obsAccordionActive}>
        <Accordion.Item eventKey="0">
          <Accordion.Header>Observation history</Accordion.Header>
          <Accordion.Body>
          <Button variant="danger" onClick={()=>showModal(-1)}>Clear history</Button>
          {observations.map((obs, index) => (
            <div key={index} className="table-responsive border rounded p-2 my-2 bg-light">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <td>Level {obs.level}</td>
                  {STATS.map(stat=>(<td key={stat}>{stat}</td>))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Stat</td>
                  {STATS.map(stat=>(<td key={stat}>{obs.stats[stat]}</td>))}
                </tr>
                <tr>
                  <td>EVs</td>
                  {STATS.map(stat=>(<td key={stat}>{obs.evs[stat]}</td>))}
                </tr>
              </tbody>
            </table>
            <Button variant="info" className="m-1" onClick={()=>editObservation(index)}>Edit</Button>
            <Button variant="danger" className="m-1" onClick={()=>showModal(index)}>Delete</Button>
            </div>
          ))}
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="1">
          <Accordion.Header>New observation</Accordion.Header>
          <Accordion.Body>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="level">Level</Form.Label>
              <Form.Control
                type="number"
                min="1"
                max="100"
                value={currObservation.level}
                onChange={e => setCurrObservation({...currObservation, level: parseInt(e.target.value) || 1})}
                id="level"
              />
            </Form.Group>
            <Row xs={1} sm={3} lg={6}>
              {STATS.map(stat => (
                <Col key={stat} className="mb-3">
                  <Form.Group>
                    <Form.Label htmlFor={`${stat}observed`}>{stat}</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      value={currObservation.stats[stat] || ''}
                      onChange={e => updateObservedStat(
                        stat,
                        parseInt(e.target.value) || undefined
                      )}
                      id={`${stat}observed`}
                    />
                  </Form.Group>
                </Col>
              ))}
            </Row>
          <Button onClick={addObservation} className="m-1">Add Observation</Button>
          <span className="border m-1 btn" onClick={e=>setIncludeCurrObservation(!includeCurrObservation)}>
          <Form.Check checked={includeCurrObservation} onChange={e=>setIncludeCurrObservation(!includeCurrObservation)} label="Include current observation?" className="d-inline-block"/>
          </span>
          </Accordion.Body>

        </Accordion.Item>
      </Accordion>

      <h2 className="mb-3">Possible IVs</h2>
      <Row>
        {STATS.map(stat => (
          <Col key={stat} md={4} className="mb-3">
            <h5>{stat}</h5>
            <div>
              {possibleIVs[stat].length === 0 ? (
                <Badge bg="danger">No possible IVs</Badge>
              ) : (
                possibleIVs[stat].map(iv => (
                  <span key={iv} className="badge me-1 mb-1" style={{backgroundColor:`rgb(${((31-iv)/31)**0.25*255},${(iv/31)**0.25*200},0)`}}>{iv}</span>
                ))
              )}
            </div>
          </Col>
        ))}
      </Row>
      <hr className="mb-3"/>
    </Container>
  );
};

export default App;