const descriptions = {
  barter:
    'Negotiate the exchange, purchase, or sale of goods and services while recognizing a fair deal.',
  cryptography:
    'Create, recognize, and break codes and ciphers. Difficult or unfamiliar encryption may impose penalties and additional study time.',
  'electronic-countermeasures':
    'Shield, encrypt, jam, scramble, trace, and protect electronic, radio, video, and wireless transmissions.',
  'radio-basic':
    'Operate conventional radio and communications equipment, understand procedure, and maintain clear transmissions.',
  'sensory-equipment':
    'Operate and interpret radar, sonar, motion detectors, surveillance sensors, and related detection systems.',
  surveillance:
    'Plan and conduct observation using stakeouts, electronic monitoring, and surveillance procedure while avoiding detection.',
  'basic-electronics':
    'Diagnose and perform basic work on common electrical wiring, circuits, and consumer electronic devices.',
  'computer-repair':
    'Diagnose, maintain, and repair computer hardware and its related electronic components.',
  'detect-ambush':
    'Recognize terrain, positioning, tracks, and subtle warning signs that indicate a prepared attack.',
  'detect-concealment':
    'Spot hidden compartments, concealed objects, camouflage, and signs that something has been deliberately hidden.',
  disguise:
    'Alter appearance, clothing, posture, and mannerisms to avoid recognition or resemble another type of person.',
  'escape-artist':
    'Escape ropes, restraints, handcuffs, and confinement through flexibility, technique, and knowledge of restraints.',
  intelligence:
    'Gather, assess, and interpret information about people, organizations, threats, and military activity.',
  interrogation:
    'Question a subject systematically, recognize evasions, and apply psychological pressure to obtain information.',
  'pick-locks':
    'Open conventional locks without the proper key using lock tools and knowledge of locking mechanisms.',
  'pick-pockets':
    'Steal or plant small objects without attracting notice through timing, distraction, and manual dexterity.',
  'tracking-people':
    'Follow people by reading footprints, disturbed terrain, discarded objects, and other signs of passage.',
  'wilderness-survival':
    'Find shelter, water, food, and safe routes while recognizing common wilderness dangers and weather exposure.',
  'first-aid':
    'Provide immediate treatment for common injuries, control bleeding, stabilize a patient, and recognize when professional care is needed.',
  'medical-doctor':
    'Diagnose and treat illness and trauma using professional medical training; the secondary rating covers surgery.',
  camouflage:
    'Hide people, equipment, vehicles, or positions by matching local terrain, light, color, and natural cover.',
  demolitions:
    'Select, place, and time explosives to achieve a controlled destructive effect while minimizing unintended damage.',
  'find-contraband':
    'Locate illegal goods and black-market services and judge where or through whom they may be obtained.',
  'recognize-weapon-quality':
    "Assess a weapon's craftsmanship, condition, reliability, value, and likely performance through inspection.",
  climbing:
    'Climb natural and artificial surfaces with or without equipment; the secondary rating covers rappelling.',
  prowl:
    'Move quietly and remain unseen by using cover, controlled movement, timing, and awareness of observers.',
  swimming:
    'Swim safely and efficiently, stay afloat, and handle ordinary water conditions without specialized diving equipment.',
  navigation:
    'Plot and follow a course using maps, instruments, landmarks, and directional calculations.',
  'weapon-systems':
    'Operate vehicle, robot, power-armor, and computerized weapon controls, targeting systems, and fire-control equipment.',
  'computer-hacking':
    'Bypass computer security, gain unauthorized access, and locate or alter protected data.',
  concealment:
    'Hide small objects on a person or in the immediate surroundings so they resist casual searches.',
  palming:
    'Secretly hold, transfer, or manipulate a small object in one hand without observers noticing.',
  streetwise:
    'Recognize criminal customs, gangs, illicit opportunities, and danger signs within an urban underworld.',
  tailing:
    'Follow a person or vehicle without being noticed while maintaining contact through crowds, traffic, and turns.',
  anthropology:
    'Study cultures, customs, social organization, beliefs, and behavior to interpret an unfamiliar people.',
  archaeology:
    'Identify, excavate, date, and interpret physical remains and artifacts from past cultures.',
  biology:
    'Understand living organisms, anatomy, ecology, heredity, and biological processes.',
  botany:
    'Identify and understand plants, including their growth, environments, uses, and hazards.',
  chemistry:
    'Identify substances and perform chemical analysis, preparation, and controlled laboratory procedures.',
  'mathematics-basic':
    'Perform practical arithmetic, fractions, percentages, measurements, and ordinary applied calculations.',
  'mathematics-advanced':
    'Use algebra, geometry, calculus, and other higher mathematical methods for scientific and technical problems.',
  'computer-operation':
    'Use computers, common software, data systems, and standard interfaces effectively.',
  'computer-programming':
    'Design, write, test, and modify software and understand programming structures and development practices.',
  'general-repair-maintenance':
    'Maintain and make practical repairs to common equipment, tools, structures, and household mechanisms.',
  'jury-rig':
    'Create an improvised, temporary repair or device from available parts, often with limited durability or reliability.',
  research:
    'Locate, compare, and evaluate useful information in books, records, databases, and other reference sources.',
  'land-navigation':
    'Travel cross-country using maps, compass, landmarks, sun, stars, and terrain without becoming lost.',
  'track-trap-animals':
    'Identify and follow animal signs and place appropriate traps; the two ratings cover tracking and trapping.',
}

export function skillDescription(skill, categories = []) {
  const specific = descriptions[skill.id]
  if (specific) return specific
  const mechanic =
    skill.base == null
      ? 'Its effects use the special bonuses or combat progression in the skill rules rather than a percentage check.'
      : `Checks begin at ${skill.base}% and improve by ${skill.perLevel}% per skill level before bonuses (maximum 98%).`
  const categoryText = categories.length
    ? ` Listed under ${categories.join(' and ')}.`
    : ''
  return `${skill.name} represents trained practical knowledge and technique in this specialty. ${skill.note || mechanic}${categoryText}`
}
