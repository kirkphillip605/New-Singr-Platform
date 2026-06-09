import { prisma } from '@singr/db'
import { triggerSongSyncDebounce } from '../../workers/song-sync.queue.js'

export async function handleCommand(command: string, data: any, system: any): Promise<any> {
  switch (command) {
    case 'connectionTest':
      return { command, connection: 'ok' }

    case 'getEntitledSystemCount': {
      const aggregate = await prisma.system.aggregate({
        where: {
          hostUsersId: system.hostUsersId,
          deletedAt: null,
        },
        _max: {
          systemNumber: true,
        },
      })
      const count = aggregate._max.systemNumber || 1
      return { command, count, error: false }
    }

    case 'sacCurVersion':
      return {
        command,
        error: false,
        stable_win64: '1.4.0',
        stable_win64_major: 1,
        stable_win64_minor: 4,
        stable_win64_build: 0,
        stable_url_win64: 'https://singrkaraoke.com/download/win64',
        stable_win32: '1.4.0',
        stable_win32_major: 1,
        stable_win32_minor: 4,
        stable_win32_build: 0,
        stable_url_win32: 'https://singrkaraoke.com/download/win32',
        stable_mac: '1.4.0',
        stable_mac_major: 1,
        stable_mac_minor: 4,
        stable_mac_build: 0,
        stable_url_mac: 'https://singrkaraoke.com/download/mac',
        stable_lin: '1.4.0',
        stable_lin_major: 1,
        stable_lin_minor: 4,
        stable_lin_build: 0,
        stable_url_lin: 'https://singrkaraoke.com/download/lin',
      }

    case 'getAlert':
      return { command, alert: false, error: false }

    case 'getSerial': {
      const activeShow = await prisma.show.findFirst({
        where: {
          activeSystemsId: system.id,
          deletedAt: null,
        },
      })
      return {
        command,
        serial: activeShow ? activeShow.serialCounter : 0,
        error: false,
      }
    }

    case 'getVenues': {
      const shows = await prisma.show.findMany({
        where: {
          hostUsersId: system.hostUsersId,
          deletedAt: null,
        },
        include: {
          venue: true,
        },
      })

      const venuesList = shows.map((show) => ({
        venue_id: show.legacyId,
        uuid: show.id,
        name: show.venue?.name ? `${show.showName} (${show.venue.name})` : show.showName,
        url_name: show.slug,
        accepting: show.isAccepting,
      }))

      return {
        command,
        error: false,
        venues: venuesList,
      }
    }

    case 'getRequests': {
      const showLegacyId = Number(data.venue_id)
      const show = await prisma.show.findFirst({
        where: {
          legacyId: showLegacyId,
          deletedAt: null,
        },
      })

      if (!show) {
        return { command, error: true, errorString: 'Show not found' }
      }

      const requests = await prisma.request.findMany({
        where: {
          showsId: show.id,
          status: 'pending',
          deletedAt: null,
        },
        include: {
          song: true,
        },
        orderBy: {
          submittedAt: 'asc',
        },
      })

      const requestList = requests.map((req) => ({
        request_id: req.legacyId,
        artist: req.song?.artist || '',
        title: req.song?.title || '',
        singer: req.singerName,
        request_time: Math.floor(req.submittedAt.getTime() / 1000),
        key_change: req.keyChange,
      }))

      return {
        command,
        error: false,
        serial: show.serialCounter,
        requests: requestList,
      }
    }

    case 'deleteRequest': {
      const requestLegacyId = Number(data.request_id)
      const showLegacyId = Number(data.venue_id)

      const show = await prisma.show.findFirst({
        where: {
          legacyId: showLegacyId,
          deletedAt: null,
        },
      })

      if (!show) {
        return { command, error: true, errorString: 'Show not found' }
      }

      const request = await prisma.request.findFirst({
        where: {
          legacyId: requestLegacyId,
          showsId: show.id,
        },
      })

      if (!request) {
        return { command, error: true, errorString: 'Request not found' }
      }

      await prisma.$transaction([
        prisma.request.update({
          where: { id: request.id },
          data: { status: 'processed', deletedAt: new Date() },
        }),
        prisma.show.update({
          where: { id: show.id },
          data: { serialCounter: { increment: 1 } },
        }),
      ])

      const updatedShow = await prisma.show.findUnique({
        where: { id: show.id },
        select: { serialCounter: true },
      })

      return {
        command,
        error: false,
        serial: updatedShow?.serialCounter || 0,
      }
    }

    case 'clearRequests': {
      const showLegacyId = Number(data.venue_id)

      const show = await prisma.show.findFirst({
        where: {
          legacyId: showLegacyId,
          deletedAt: null,
        },
      })

      if (!show) {
        return { command, error: true, errorString: 'Show not found' }
      }

      await prisma.$transaction([
        prisma.request.updateMany({
          where: {
            showsId: show.id,
            status: 'pending',
            deletedAt: null,
          },
          data: { status: 'processed', deletedAt: new Date() },
        }),
        prisma.show.update({
          where: { id: show.id },
          data: { serialCounter: { increment: 1 } },
        }),
      ])

      const updatedShow = await prisma.show.findUnique({
        where: { id: show.id },
        select: { serialCounter: true },
      })

      return {
        command,
        error: false,
        serial: updatedShow?.serialCounter || 0,
      }
    }

    case 'setAccepting': {
      const showLegacyId = Number(data.venue_id)
      const accepting = Boolean(data.accepting)

      const show = await prisma.show.findFirst({
        where: {
          legacyId: showLegacyId,
          deletedAt: null,
        },
      })

      if (!show) {
        return { command, error: true, errorString: 'Show not found' }
      }

      const updatedShow = await prisma.show.update({
        where: { id: show.id },
        data: {
          isAccepting: accepting,
          activeSystemsId: system.id, // physically routing singer traffic to this active system
          serialCounter: { increment: 1 },
        },
      })

      return {
        command,
        error: false,
        venue_id: showLegacyId,
        accepting: updatedShow.isAccepting,
        serial: updatedShow.serialCounter,
      }
    }

    case 'clearDatabase': {
      await prisma.songShadow.deleteMany({
        where: {
          systemsId: system.id,
        },
      })

      const activeShow = await prisma.show.findFirst({
        where: {
          activeSystemsId: system.id,
          deletedAt: null,
        },
      })

      let newSerial = 0
      if (activeShow) {
        await prisma.$transaction([
          prisma.request.updateMany({
            where: {
              showsId: activeShow.id,
              status: 'pending',
              deletedAt: null,
            },
            data: { status: 'processed', deletedAt: new Date() },
          }),
          prisma.show.update({
            where: { id: activeShow.id },
            data: {
              isAccepting: false,
              serialCounter: { increment: 1 },
            },
          }),
        ])

        const updatedShow = await prisma.show.findUnique({
          where: { id: activeShow.id },
          select: { serialCounter: true },
        })
        newSerial = updatedShow?.serialCounter || 0
      }

      return {
        command,
        error: false,
        serial: newSerial,
      }
    }

    case 'addSongs': {
      const songs = data.songs
      if (!Array.isArray(songs)) {
        return { command, error: true, errorString: 'Songs parameter must be an array' }
      }

      await prisma.songShadow.createMany({
        data: songs.map((song: any) => ({
          systemsId: system.id,
          artist: song.artist || '',
          title: song.title || '',
        })),
      })

      await triggerSongSyncDebounce(system.id)

      const lastSong = songs[songs.length - 1]

      return {
        command,
        error: 'false',
        errors: [],
        'entries processed': songs.length,
        last_artist: lastSong?.artist || '',
        last_title: lastSong?.title || '',
      }
    }

    default:
      return { command, error: true, errorString: `Unsupported command: ${command}` }
  }
}


