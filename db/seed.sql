-- Seed data for demo and development

INSERT INTO rooms (room_id, room_type, description, total_rooms, available_rooms, image_url) VALUES
  (1, 'Standard - Single King', 'Comfortable standard room with a single king bed, ideal for solo travelers or couples.', 4, 4, 'https://github.com/BRHackett/Moffat-Bay/blob/main/src/images/reservation-2.jpg?raw=true'),
  (2, 'Standard - Single Queen', 'Cozy standard room featuring a queen bed and essential amenities.', 3, 3, 'https://github.com/BRHackett/Moffat-Bay/blob/main/src/images/single-queen.jpg?raw=true'),
  (3, 'Standard - Double Queen', 'Spacious standard room with two queen beds, perfect for families or groups.', 2, 2, 'https://github.com/BRHackett/Moffat-Bay/blob/main/src/images/double-queen.jpg?raw=true'),
  (4, 'Deluxe - Single King', 'Upgraded deluxe room with a king bed and enhanced furnishings.', 3, 3, 'https://github.com/BRHackett/Moffat-Bay/blob/main/src/images/reservation-1.jpg?raw=true'),
  (5, 'Deluxe - Single Queen', 'Deluxe queen room with premium touches and bay-inspired décor.', 2, 2, 'https://github.com/BRHackett/Moffat-Bay/blob/main/src/images/single-deluxe-queen.jpg?raw=true'),
  (6, 'Deluxe - Double Queen', 'Generous deluxe layout with two queen beds and extra living space.', 2, 2, 'https://github.com/BRHackett/Moffat-Bay/blob/main/src/images/deluxe-2-Queen.jpg?raw=true'),
  (7, 'Suite - 1 Room', 'One-room suite with separated seating area and upgraded amenities.', 2, 2, 'https://github.com/BRHackett/Moffat-Bay/blob/main/src/images/suite.jpg?raw=true'),
  (8, 'Suite - 2 Room', 'Two-room suite for extra privacy—ideal for extended stays.', 1, 1, 'https://github.com/BRHackett/Moffat-Bay/blob/main/src/images/2-suite.jpg?raw=true')
ON CONFLICT (room_id) DO NOTHING;

SELECT setval('rooms_room_id_seq', (SELECT COALESCE(MAX(room_id), 1) FROM rooms));

-- Passwords are set by scripts/init-db.js (bcrypt hashes for demo/demo and admin/admin)
